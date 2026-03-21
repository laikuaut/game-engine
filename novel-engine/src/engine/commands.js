import { CMD, ACTION } from "./constants";

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
  return map;
}

// ジャンプ先を解決（文字列ならラベル名、数値ならインデックス）
export function resolveTarget(target, labelMap) {
  if (typeof target === "number") return target;
  if (typeof target === "string") {
    const index = labelMap[target];
    if (index === undefined) {
      console.warn(`ラベル未発見: "${target}"`);
      return -1;
    }
    return index;
  }
  return -1;
}

// dialog / choice / wait / effect 以外のコマンドを連続処理
// 戻り値: { index, blocking } — blocking が true のとき NovelEngine 側で非同期処理が必要
export function processCommand(script, index, dispatch, labelMap) {
  let i = index;
  while (i < script.length) {
    const cmd = script[i];
    if (!cmd) break;
    // dialog / choice はここで中断
    if (cmd.type === CMD.DIALOG || cmd.type === CMD.CHOICE) break;

    switch (cmd.type) {
      case CMD.BG:
        dispatch({
          type: ACTION.SET_BG,
          payload: { src: cmd.src, transition: cmd.transition, time: cmd.time },
        });
        break;
      case CMD.BGM:
        dispatch({ type: ACTION.SET_BGM, payload: cmd.name });
        break;
      case CMD.BGM_STOP:
        dispatch({ type: ACTION.STOP_BGM });
        break;
      case CMD.SE:
        dispatch({ type: ACTION.SET_SE, payload: cmd.name });
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
          payload: { id: cmd.id, expression: cmd.expression },
        });
        break;
      case CMD.CHARA_HIDE:
        dispatch({ type: ACTION.REMOVE_CHARA, payload: cmd.id });
        break;
      case CMD.LABEL:
        // ラベルはマーカーなのでスキップ
        break;
      case CMD.JUMP: {
        const jumpIndex = resolveTarget(cmd.target, labelMap);
        if (jumpIndex >= 0 && jumpIndex !== i) {
          // ジャンプ先から再帰的に processCommand
          return processCommand(script, jumpIndex, dispatch, labelMap);
        }
        break;
      }
      case CMD.NVL_ON:
        dispatch({ type: "SET_NVL_MODE", payload: true });
        break;
      case CMD.NVL_OFF:
        dispatch({ type: "SET_NVL_MODE", payload: false });
        break;
      case CMD.NVL_CLEAR:
        dispatch({ type: "CLEAR_NVL" });
        break;
      case CMD.CG:
        // CG 表示はループ中断（クリックで閉じる）
        dispatch({ type: "SHOW_CG", payload: { id: cmd.id, src: cmd.src } });
        return { index: i, blocking: "cg" };
      case CMD.WAIT:
        dispatch({ type: ACTION.START_WAIT });
        return { index: i, blocking: "wait" };
      case CMD.EFFECT:
        // effect はループ中断 → NovelEngine 側でアニメーション管理
        dispatch({
          type: ACTION.START_EFFECT,
          payload: {
            name: cmd.name,
            color: cmd.color,
            time: cmd.time,
            intensity: cmd.intensity,
          },
        });
        return { index: i, blocking: "effect" };
    }
    i++;
  }
  return { index: i, blocking: null };
}
