import { CMD, ACTION } from "./constants";

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[commands]", ...args);
}

// ラベルマップを構築（script 配列から label name → index のマップ）
export function buildLabelMap(script) {
  const map = {};
  script.forEach((cmd, index) => {
    if (cmd.type === CMD.LABEL && cmd.name) {
      if (map[cmd.name] !== undefined) {
        console.warn(`重複ラベル: "${cmd.name}" (index ${map[cmd.name]} と ${index})`);
      }
      map[cmd.name] = index;
    }
  });
  log("buildLabelMap: スクリプト長 =", script.length, ", ラベル数 =", Object.keys(map).length, ", ラベル =", Object.keys(map));
  return map;
}

// ジャンプ先を解決（文字列ならラベル名、数値ならインデックス）
export function resolveTarget(target, labelMap) {
  if (typeof target === "number") {
    log("resolveTarget: 数値 →", target);
    return target;
  }
  if (typeof target === "string") {
    const index = labelMap[target];
    if (index === undefined) {
      console.warn(`[commands] ラベル未発見: "${target}", 利用可能: [${Object.keys(labelMap).join(", ")}]`);
      return -1;
    }
    log("resolveTarget:", target, "→ index", index);
    return index;
  }
  log("resolveTarget: 不正な target 型 →", typeof target, target);
  return -1;
}

// シーンスコープ付きラベル名を生成
function scopedLabel(sceneId, labelName) {
  return `${sceneId}/${labelName}`;
}

// シーン内のラベル名一覧を収集
function collectSceneLabels(commands) {
  const labels = new Set();
  for (const cmd of commands) {
    if (cmd.type === CMD.LABEL && cmd.name) {
      labels.add(cmd.name);
    }
  }
  return labels;
}

// シーン内コマンドを展開用に書き換える
// 1. ラベル → スコープ付きラベルに変換（衝突防止）
// 2. jump/choice の target を補正:
//    - 数値 → グローバルオフセット加算
//    - 文字列でシーン内ラベルと一致 → スコープ付きに変換
//    - 文字列でシーン内に無い → グローバルラベルとしてそのまま維持
function rewriteSceneCommands(commands, globalOffset, sceneId) {
  const localLabels = collectSceneLabels(commands);
  log("rewriteSceneCommands:", sceneId, ", localLabels:", [...localLabels], ", globalOffset:", globalOffset);

  return commands.map((cmd) => {
    // ラベルのスコープ化
    if (cmd.type === CMD.LABEL && cmd.name) {
      const scoped = scopedLabel(sceneId, cmd.name);
      log("  label スコープ化:", cmd.name, "→", scoped);
      return { ...cmd, name: scoped };
    }
    // jump target の補正
    if (cmd.type === CMD.JUMP) {
      const rewritten = rewriteTarget(cmd.target, globalOffset, sceneId, localLabels);
      if (rewritten !== cmd.target) {
        log("  jump 補正:", cmd.target, "→", rewritten);
      }
      return { ...cmd, target: rewritten };
    }
    // choice options の jump 補正
    if (cmd.type === CMD.CHOICE && cmd.options) {
      const newOptions = cmd.options.map((opt) => {
        const rewritten = rewriteTarget(opt.jump, globalOffset, sceneId, localLabels);
        if (rewritten !== opt.jump) {
          log("  choice 補正:", `"${opt.text}"`, opt.jump, "→", rewritten);
        }
        return { ...opt, jump: rewritten };
      });
      return { ...cmd, options: newOptions };
    }
    return cmd;
  });
}

function rewriteTarget(target, globalOffset, sceneId, localLabels) {
  if (typeof target === "number") {
    // 数値 → シーン内ローカルインデックスをグローバルに変換
    return target + globalOffset;
  }
  if (typeof target === "string") {
    if (localLabels.has(target)) {
      // シーン内ラベル → スコープ付きに変換
      return scopedLabel(sceneId, target);
    }
    // シーン内に無いラベル → グローバルラベルとしてそのまま（他シーンやスクリプトのラベル）
    return target;
  }
  return target;
}

// シーン参照を展開して1本のスクリプト配列に変換
// { type: "scene", sceneId: "scene_xxx" } → シーンラベル + スコープ化されたコマンド群
//
// 展開時の処理:
//   1. シーン先頭にシーン名ラベルを挿入（スコープ無し = 他シーンからジャンプ可能）
//   2. シーン内ラベルをスコープ化（衝突防止: "start" → "sceneId/start"）
//   3. シーン内ジャンプ先を自動解決:
//      - 数値 → グローバルオフセット加算
//      - 文字列（シーン内ラベル一致） → スコープ付きに変換
//      - 文字列（シーン外ラベル） → そのまま維持
export function expandScenes(script, scenes) {
  if (!scenes || scenes.length === 0) {
    log("expandScenes: シーンなし, スクリプトをそのまま返却 (長さ:", script.length, ")");
    return script;
  }
  const sceneMap = {};
  for (const s of scenes) {
    sceneMap[s.id] = s;
  }
  const sceneRefs = script.filter((c) => c.type === CMD.SCENE).length;
  log("expandScenes: スクリプト長 =", script.length, ", シーン参照数 =", sceneRefs, ", 利用可能シーン =", Object.keys(sceneMap).length);

  const result = [];
  for (const cmd of script) {
    if (cmd.type === CMD.SCENE) {
      const scene = sceneMap[cmd.sceneId];
      if (scene) {
        // シーン先頭ラベル（スコープ無し — 外部からのジャンプ先として機能）
        const entryLabel = cmd.label || scene.name;
        result.push({ type: CMD.LABEL, name: entryLabel });
        // globalOffset = シーン先頭ラベルの次 = シーン内 index 0 のグローバル位置
        const globalOffset = result.length;
        const rewritten = rewriteSceneCommands(scene.commands, globalOffset, cmd.sceneId);
        result.push(...rewritten);
        log("expandScenes: シーン展開 →", cmd.sceneId, `"${scene.name}"`,
          ", コマンド数:", scene.commands.length,
          ", globalOffset:", globalOffset,
          ", entryLabel:", entryLabel);
      } else {
        console.warn(`[commands] シーン未発見: "${cmd.sceneId}", 利用可能: [${Object.keys(sceneMap).join(", ")}]`);
      }
    } else {
      result.push(cmd);
    }
  }
  log("expandScenes: 展開後スクリプト長 =", result.length);
  return result;
}

// コマンドの簡易表示（ログ用）
function cmdStr(cmd) {
  if (!cmd) return "(null)";
  switch (cmd.type) {
    case CMD.DIALOG: return `dialog[${cmd.speaker || "ナレ"}] "${(cmd.text || "").substring(0, 20)}…"`;
    case CMD.BG: return `bg[${cmd.src}]`;
    case CMD.BGM: return `bgm[${cmd.name}]`;
    case CMD.BGM_STOP: return "bgm_stop";
    case CMD.SE: return `se[${cmd.name}]`;
    case CMD.CHARA: return `chara[${cmd.id} ${cmd.position} ${cmd.expression}]`;
    case CMD.CHARA_MOD: return `chara_mod[${cmd.id} → ${cmd.expression}]`;
    case CMD.CHARA_HIDE: return `chara_hide[${cmd.id}]`;
    case CMD.CHOICE: return `choice[${cmd.options?.length || 0}択]`;
    case CMD.EFFECT: return `effect[${cmd.name} ${cmd.time || 0}ms]`;
    case CMD.WAIT: return `wait[${cmd.time || 0}ms]`;
    case CMD.JUMP: return `jump[→ ${cmd.target}]`;
    case CMD.LABEL: return `label[${cmd.name}]`;
    case CMD.CG: return `cg[${cmd.id}]`;
    case CMD.CG_HIDE: return `cg_hide`;
    case CMD.NVL_ON: return "nvl_on";
    case CMD.NVL_OFF: return "nvl_off";
    case CMD.NVL_CLEAR: return "nvl_clear";
    case CMD.SET_FLAG: return `set_flag[${cmd.key}=${cmd.value}]`;
    case CMD.SET_VARIABLE: return `set_var[${cmd.key}${cmd.operator || "="}${cmd.value}]`;
    case CMD.IF_FLAG: return `if_flag[${cmd.key}→${cmd.jump}]`;
    case CMD.IF_VARIABLE: return `if_var[${cmd.key}${cmd.operator}${cmd.value}→${cmd.jump}]`;
    case CMD.ADD_ITEM: return `add_item[${cmd.id}+${cmd.amount || 1}]`;
    case CMD.REMOVE_ITEM: return `rm_item[${cmd.id}-${cmd.amount || 1}]`;
    case CMD.CHECK_ITEM: return `chk_item[${cmd.id}→${cmd.jump}]`;
    case CMD.ACTION_STAGE: return `action[${cmd.stageId}]`;
    default: return `unknown[${cmd.type}]`;
  }
}

// dialog / choice / wait / effect 以外のコマンドを連続処理
// 戻り値: { index, blocking } — blocking が true のとき NovelEngine 側で非同期処理が必要
export function processCommand(script, index, dispatch, labelMap, gameState, unlockFn) {
  // gameState: { flags, variables, items } — 条件分岐コマンドで参照
  // unlockFn: (type, id) => void — CG/シーン解放トリガー
  // gsはローカルコピー: set_flag等で即座に更新し、後続のif_flagで参照可能にする
  const gs = gameState
    ? { flags: { ...gameState.flags }, variables: { ...gameState.variables }, items: { ...gameState.items } }
    : { flags: {}, variables: {}, items: {} };
  log("processCommand: 開始 index =", index);
  let i = index;
  let processed = 0;
  while (i < script.length) {
    const cmd = script[i];
    if (!cmd) {
      log("processCommand: null コマンド at index", i);
      break;
    }
    // 無効化されたコマンドはスキップ
    if (cmd.disabled) {
      log("processCommand: disabled スキップ →", cmdStr(cmd), "at index", i);
      i++;
      processed++;
      continue;
    }
    // dialog / choice はここで中断
    if (cmd.type === CMD.DIALOG || cmd.type === CMD.CHOICE) {
      log("processCommand: ブロッキング検出 →", cmdStr(cmd), "at index", i, `(${processed}件処理済)`);
      break;
    }

    log("processCommand: [", i, "]", cmdStr(cmd));

    switch (cmd.type) {
      case CMD.BG:
        dispatch({
          type: ACTION.SET_BG,
          payload: { src: cmd.src, transition: cmd.transition, time: cmd.time },
        });
        break;
      case CMD.BGM:
        dispatch({
          type: ACTION.SET_BGM,
          payload: { name: cmd.name, volume: cmd.volume, loop: cmd.loop },
        });
        break;
      case CMD.BGM_STOP:
        dispatch({ type: ACTION.STOP_BGM });
        break;
      case CMD.SE:
        dispatch({
          type: ACTION.SET_SE,
          payload: { name: cmd.name, volume: cmd.volume },
        });
        break;
      case CMD.CHARA:
        dispatch({
          type: ACTION.SET_CHARA,
          payload: { id: cmd.id, position: cmd.position, expression: cmd.expression },
        });
        break;
      case CMD.CHARA_MOD:
        dispatch({
          type: ACTION.MOD_CHARA,
          payload: { id: cmd.id, expression: cmd.expression, anim: cmd.anim },
        });
        break;
      case CMD.CHARA_HIDE:
        dispatch({ type: ACTION.REMOVE_CHARA, payload: cmd.id });
        break;
      case CMD.LABEL:
        log("processCommand: ラベル通過 →", cmd.name);
        if (cmd.recollection && unlockFn) {
          unlockFn("scene", cmd.name);
          log("processCommand: シーン解放 →", cmd.name);
        }
        break;
      case CMD.JUMP: {
        const jumpIndex = resolveTarget(cmd.target, labelMap);
        if (jumpIndex >= 0 && jumpIndex !== i) {
          log("processCommand: ジャンプ実行", i, "→", jumpIndex);
          return processCommand(script, jumpIndex, dispatch, labelMap, gs, unlockFn);
        }
        log("processCommand: ジャンプ無効 (jumpIndex =", jumpIndex, ", 現在 =", i, ")");
        break;
      }
      case CMD.NVL_ON:
        dispatch({ type: ACTION.SET_NVL_MODE, payload: true });
        break;
      case CMD.NVL_OFF:
        dispatch({ type: ACTION.SET_NVL_MODE, payload: false });
        break;
      case CMD.NVL_CLEAR:
        dispatch({ type: ACTION.CLEAR_NVL });
        break;
      case CMD.CG:
        dispatch({ type: ACTION.SHOW_CG, payload: { id: cmd.id, variant: cmd.variant } });
        if (unlockFn) unlockFn("cg", cmd.id);
        log("processCommand: CG 表示（レイヤー）+ 解放 at index", i);
        break;
      case CMD.CG_HIDE:
        dispatch({ type: ACTION.HIDE_CG });
        log("processCommand: CG 非表示 at index", i);
        break;
      case CMD.WAIT:
        dispatch({ type: ACTION.START_WAIT });
        log("processCommand: wait ブロッキング at index", i, ", time =", cmd.time);
        return { index: i, blocking: "wait" };
      case CMD.EFFECT:
        if (cmd.clearText) {
          dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: "" });
          dispatch({ type: ACTION.SET_SPEAKER, payload: "" });
        }
        dispatch({
          type: ACTION.START_EFFECT,
          payload: {
            name: cmd.name,
            color: cmd.color,
            time: cmd.time,
            intensity: cmd.intensity,
          },
        });
        log("processCommand: effect ブロッキング at index", i, ", name =", cmd.name);
        return { index: i, blocking: "effect" };
      case CMD.ACTION_STAGE:
        log("processCommand: action_stage ブロッキング at index", i, ", stageId =", cmd.stageId);
        return { index: i, blocking: "action_stage" };
      // フラグ・変数・アイテム
      case CMD.SET_FLAG: {
        const flagValue = cmd.value !== false;
        dispatch({ type: ACTION.SET_FLAG, payload: { key: cmd.key, value: flagValue } });
        gs.flags[cmd.key] = flagValue; // ローカル即時反映
        log("processCommand: set_flag →", cmd.key, "=", flagValue);
        break;
      }
      case CMD.SET_VARIABLE: {
        const varValue = Number(cmd.value) || 0;
        const varOp = cmd.operator || "=";
        dispatch({ type: ACTION.SET_VARIABLE, payload: { key: cmd.key, value: varValue, operator: varOp } });
        // ローカル即時反映
        const prev = gs.variables[cmd.key] || 0;
        switch (varOp) {
          case "+=": gs.variables[cmd.key] = prev + varValue; break;
          case "-=": gs.variables[cmd.key] = prev - varValue; break;
          case "*=": gs.variables[cmd.key] = prev * varValue; break;
          default:   gs.variables[cmd.key] = varValue; break;
        }
        log("processCommand: set_variable →", cmd.key, varOp, varValue);
        break;
      }
      case CMD.IF_FLAG: {
        const flagVal = !!gs.flags[cmd.key];
        const expected = cmd.value !== false;
        const match = cmd.operator === "!=" ? (flagVal !== expected) : (flagVal === expected);
        log("processCommand: if_flag →", cmd.key, "=", flagVal, cmd.operator || "==", expected, "→", match);
        if (match && cmd.jump) {
          const target = resolveTarget(cmd.jump, labelMap);
          if (target >= 0) return processCommand(script, target, dispatch, labelMap, gs, unlockFn);
        }
        break;
      }
      case CMD.IF_VARIABLE: {
        const varVal = gs.variables[cmd.key] || 0;
        const cmpVal = Number(cmd.value) || 0;
        let varMatch = false;
        switch (cmd.operator) {
          case "==": varMatch = varVal === cmpVal; break;
          case "!=": varMatch = varVal !== cmpVal; break;
          case ">":  varMatch = varVal > cmpVal; break;
          case "<":  varMatch = varVal < cmpVal; break;
          case ">=": varMatch = varVal >= cmpVal; break;
          case "<=": varMatch = varVal <= cmpVal; break;
          default:   varMatch = varVal === cmpVal; break;
        }
        log("processCommand: if_variable →", cmd.key, "=", varVal, cmd.operator || "==", cmpVal, "→", varMatch);
        if (varMatch && cmd.jump) {
          const target = resolveTarget(cmd.jump, labelMap);
          if (target >= 0) return processCommand(script, target, dispatch, labelMap, gs, unlockFn);
        }
        break;
      }
      case CMD.ADD_ITEM: {
        const addAmt = Number(cmd.amount) || 1;
        dispatch({ type: ACTION.ADD_ITEM, payload: { id: cmd.id, amount: addAmt } });
        gs.items[cmd.id] = (gs.items[cmd.id] || 0) + addAmt; // ローカル即時反映
        log("processCommand: add_item →", cmd.id, "+", addAmt);
        break;
      }
      case CMD.REMOVE_ITEM: {
        const rmAmt = Number(cmd.amount) || 1;
        dispatch({ type: ACTION.REMOVE_ITEM, payload: { id: cmd.id, amount: rmAmt } });
        // ローカル即時反映
        const remain = (gs.items[cmd.id] || 0) - rmAmt;
        if (remain <= 0) delete gs.items[cmd.id]; else gs.items[cmd.id] = remain;
        log("processCommand: remove_item →", cmd.id, "-", rmAmt);
        break;
      }
      case CMD.CHECK_ITEM: {
        const itemCount = gs.items[cmd.id] || 0;
        const reqAmount = Number(cmd.amount) || 1;
        const itemMatch = itemCount >= reqAmount;
        log("processCommand: check_item →", cmd.id, "所持:", itemCount, ">=", reqAmount, "→", itemMatch);
        if (itemMatch && cmd.jump) {
          const target = resolveTarget(cmd.jump, labelMap);
          if (target >= 0) return processCommand(script, target, dispatch, labelMap, gs, unlockFn);
        }
        break;
      }
      default:
        log("processCommand: 未知のコマンド型 →", cmd.type, "at index", i);
        break;
    }
    i++;
    processed++;
  }
  if (i >= script.length) {
    log("processCommand: スクリプト末端到達 (index =", i, ", length =", script.length, ")");
  }
  return { index: i, blocking: null };
}
