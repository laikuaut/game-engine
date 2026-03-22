import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from "react";
import { ACTION, CMD } from "./constants";
import { engineReducer, initialState } from "./reducer";
import { processCommand, buildLabelMap, resolveTarget, expandScenes } from "./commands";
import DEFAULT_SCRIPT from "../data/script";

import Background from "../components/Background";
import Character from "../components/Character";
import TextBox from "../components/TextBox";
import Controls from "../components/Controls";
import ChoiceOverlay from "../components/ChoiceOverlay";
import BacklogView from "../components/BacklogView";
import SaveLoadView from "../components/SaveLoadView";
import ConfigView from "../components/ConfigView";
import NVLTextBox from "../components/NVLTextBox";
import ScreenEffects from "../effects/ScreenEffects";
import useAudio from "../audio/useAudio";
import { saveGame, loadGame, listSlots } from "../save/SaveManager";
import { unlock as unlockCG } from "../save/UnlockStore";
import { getAssetUrl } from "../project/ProjectStore";
import HelpModal from "../components/HelpModal";
import { NOVEL_HELP } from "../data/helpContent";

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[NovelEngine]", ...args);
}

export default function NovelEngine({ script, characters, bgStyles, onBack, projectId, startLabel, initialStartIndex = 0, initialConfig, onConfigChange, storyScenes, bgmCatalog, seCatalog }) {
  // シーン参照を展開してフラットなスクリプトに変換
  const SCRIPT = useMemo(
    () => expandScenes(script || DEFAULT_SCRIPT, storyScenes),
    [script, storyScenes]
  );
  const [state, dispatch] = useReducer(engineReducer, {
    ...initialState,
    ...(initialConfig ? {
      textSpeed: initialConfig.textSpeed ?? initialState.textSpeed,
      volumeMaster: initialConfig.volumeMaster ?? initialState.volumeMaster,
      volumeBGM: initialConfig.volumeBGM ?? initialState.volumeBGM,
      volumeSE: initialConfig.volumeSE ?? initialState.volumeSE,
    } : {}),
  });
  // オーディオフック
  useAudio(state, projectId, { bgmCatalog, seCatalog });

  const typingRef = useRef(null);
  const autoRef = useRef(null);
  const waitRef = useRef(null);
  const skipRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);
  const fullTextRef = useRef("");
  const containerRef = useRef(null);
  const scriptRef = useRef(SCRIPT);
  scriptRef.current = SCRIPT;

  // ラベルマップ構築
  const labelMap = useMemo(() => buildLabelMap(SCRIPT), [SCRIPT]);

  // dialog / choice / wait / effect 以外を連続処理
  const runCommands = useCallback(
    (index) => processCommand(scriptRef.current, index, dispatch, labelMap),
    [labelMap]
  );

  // コマンド結果を処理する共通ヘルパー
  const handleCommandResult = useCallback(
    (result) => {
      const { index, blocking } = result;
      log("handleCommandResult: index =", index, ", blocking =", blocking);

      if (blocking === "wait") {
        dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
        const cmd = scriptRef.current[index];
        const waitTime = cmd?.time || 1000;
        log("wait 開始:", waitTime, "ms");
        waitRef.current = setTimeout(() => {
          waitRef.current = null;
          log("wait 完了, 次へ →", index + 1);
          dispatch({ type: ACTION.END_WAIT });
          proceedFrom(index + 1);
        }, waitTime);
        return;
      }

      if (blocking === "effect") {
        log("effect ブロッキング中, エフェクト完了待ち");
        dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
        return;
      }

      if (blocking === "cg") {
        log("CG 表示中, クリック待ち");
        dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
        return;
      }

      // blocking なし → dialog or choice or スクリプト終端
      if (index >= scriptRef.current.length) {
        log("スクリプト末端到達 → タイトルへ戻る");
        if (onBack) setTimeout(() => onBack(), 500);
        return;
      }
      const cmd = scriptRef.current[index];
      dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
      if (cmd.type === CMD.DIALOG) {
        log("dialog 開始: [", cmd.speaker || "ナレ", "]", (cmd.text || "").substring(0, 30));
        startDialog(index);
      } else if (cmd.type === CMD.CHOICE) {
        log("choice 表示:", cmd.options?.length, "択 →", cmd.options?.map((o) => o.text).join(" / "));
        dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: "" });
        dispatch({ type: ACTION.SET_SPEAKER, payload: "" });
        dispatch({ type: ACTION.SHOW_CHOICE, payload: cmd.options });
        dispatch({ type: ACTION.SET_SKIP_MODE, payload: false });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 指定インデックスから processCommand → 結果処理
  const proceedFrom = useCallback(
    (index) => {
      log("proceedFrom:", index, "/", scriptRef.current.length);
      if (index >= scriptRef.current.length) {
        log("proceedFrom: スクリプト末端 → タイトルへ");
        if (onBack) setTimeout(() => onBack(), 500);
        return;
      }
      const result = processCommand(scriptRef.current, index, dispatch, labelMap);
      handleCommandResult(result);
    },
    [labelMap, handleCommandResult]
  );

  // テキストのタイプライター表示開始
  const startDialog = useCallback(
    (index) => {
      const cmd = scriptRef.current[index];
      if (!cmd || cmd.type !== CMD.DIALOG) return;
      dispatch({ type: ACTION.SET_SPEAKER, payload: cmd.speaker });

      // NVL モード: テキストを蓄積
      if (state.nvlMode) {
        dispatch({ type: ACTION.ADD_NVL_TEXT, payload: { speaker: cmd.speaker, text: cmd.text } });
      }

      // スキップ中はタイプライターをバイパス
      if (state.skipMode || state.ctrlPressed) {
        dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: cmd.text });
        dispatch({ type: ACTION.SET_TYPING, payload: false });
        dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: cmd.speaker, text: cmd.text } });
        fullTextRef.current = cmd.text;
        return;
      }

      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: "" });
      dispatch({ type: ACTION.SET_TYPING, payload: true });
      fullTextRef.current = cmd.text;
      let charIndex = 0;
      if (typingRef.current) clearInterval(typingRef.current);
      typingRef.current = setInterval(() => {
        charIndex++;
        if (charIndex >= cmd.text.length) {
          clearInterval(typingRef.current);
          typingRef.current = null;
          dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: cmd.text });
          dispatch({ type: ACTION.SET_TYPING, payload: false });
          dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: cmd.speaker, text: cmd.text } });
        } else {
          dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: cmd.text.substring(0, charIndex) });
        }
      }, state.textSpeed);
    },
    [state.textSpeed, state.skipMode, state.ctrlPressed]
  );

  // テキスト送り
  const advance = useCallback(() => {
    if (state.showChoice || state.showBacklog || state.showConfig || state.showSaveLoad) {
      log("advance: UI表示中のためスキップ (choice:", state.showChoice, ", backlog:", state.showBacklog, ", config:", state.showConfig, ", saveLoad:", state.showSaveLoad, ")");
      return;
    }

    // CG 表示中 → 閉じて次へ
    if (state.showCG) {
      log("advance: CG 閉じる →", state.showCG.id);
      unlockCG("cg", state.showCG.id);
      dispatch({ type: ACTION.HIDE_CG });
      proceedFrom(state.scriptIndex + 1);
      return;
    }

    // wait 中のクリック → 即座にスキップ
    if (state.isWaiting) {
      log("advance: wait スキップ");
      if (waitRef.current) {
        clearTimeout(waitRef.current);
        waitRef.current = null;
      }
      dispatch({ type: ACTION.END_WAIT });
      proceedFrom(state.scriptIndex + 1);
      return;
    }

    // エフェクト中は無視
    if (state.activeEffect) {
      log("advance: エフェクト中のため無視 →", state.activeEffect?.name);
      return;
    }

    // タイプ中 → 即座に全文表示
    if (state.isTyping) {
      log("advance: タイプ中 → 全文表示");
      if (typingRef.current) clearInterval(typingRef.current);
      typingRef.current = null;
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: fullTextRef.current });
      dispatch({ type: ACTION.SET_TYPING, payload: false });
      const cmd = scriptRef.current[state.scriptIndex];
      if (cmd && cmd.type === CMD.DIALOG) {
        dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: cmd.speaker, text: cmd.text } });
      }
      return;
    }

    // 次のコマンドへ
    log("advance: 次のコマンドへ →", state.scriptIndex + 1);
    proceedFrom(state.scriptIndex + 1);
  }, [
    state.scriptIndex, state.isTyping, state.isWaiting, state.activeEffect,
    state.showChoice, state.showBacklog, state.showConfig, state.showSaveLoad,
    proceedFrom,
  ]);

  // 選択肢処理
  const handleChoice = useCallback(
    (option) => {
      log("handleChoice:", option.text, "→ jump:", option.jump);
      dispatch({ type: ACTION.HIDE_CHOICE });
      dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: "選択", text: option.text } });
      const jumpTarget = resolveTarget(option.jump, labelMap);
      if (jumpTarget < 0) {
        log("handleChoice: ジャンプ先解決失敗");
        return;
      }
      log("handleChoice: ジャンプ先 →", jumpTarget);
      proceedFrom(jumpTarget);
    },
    [labelMap, proceedFrom]
  );

  // セーブスロット初期ロード
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const slots = await listSlots(projectId);
      dispatch({ type: ACTION.SET_SAVES, payload: slots });
    })();
  }, [projectId]);

  // セーブ処理（永続化込み + サムネイル）
  const handleSave = useCallback(async (slot) => {
    log("handleSave: slot =", slot, ", scriptIndex =", state.scriptIndex);
    // Canvas からサムネイル取得を試みる
    let thumbnail = null;
    try {
      const canvas = containerRef.current?.querySelector("canvas");
      if (canvas) {
        thumbnail = canvas.toDataURL("image/jpeg", 0.3);
      }
    } catch {}
    dispatch({ type: ACTION.SAVE_GAME, payload: { slot, thumbnail } });
    if (projectId) {
      await saveGame(projectId, slot, { ...state, thumbnail });
    }
  }, [projectId, state]);

  // ロード処理（永続化からフルデータ取得）
  const handleLoad = useCallback(async (slot) => {
    log("handleLoad: slot =", slot);
    if (projectId) {
      const data = await loadGame(projectId, slot);
      if (data?.state) {
        log("handleLoad: 永続化データ取得成功, scriptIndex =", data.state.scriptIndex);
        dispatch({ type: ACTION.LOAD_GAME, payload: { slot, data: data.state } });
        return;
      }
      log("handleLoad: 永続化データなし, インメモリフォールバック");
    }
    dispatch({ type: ACTION.LOAD_GAME, payload: { slot } });
  }, [projectId]);

  // エフェクト完了コールバック
  const onEffectEnd = useCallback(() => {
    log("onEffectEnd: エフェクト完了, 次へ →", state.scriptIndex + 1);
    dispatch({ type: ACTION.EFFECT_END });
    proceedFrom(state.scriptIndex + 1);
  }, [state.scriptIndex, proceedFrom]);

  // キャラアニメーション管理
  useEffect(() => {
    const timers = [];
    Object.entries(state.characters).forEach(([id, chara]) => {
      if (chara.animState === "entering") {
        timers.push(setTimeout(() => dispatch({ type: ACTION.CHARA_ANIM_DONE, payload: id }), 500));
      } else if (chara.animState === "exiting") {
        timers.push(setTimeout(() => dispatch({ type: ACTION.REMOVE_CHARA_DONE, payload: id }), 400));
      } else if (chara.animState === "expression_change") {
        timers.push(setTimeout(() => dispatch({ type: ACTION.CHARA_ANIM_DONE, payload: id }), 300));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [state.characters]);

  // 初回シーン処理（startLabel がある場合はそのラベルから開始）
  useEffect(() => {
    let startIndex = 0;
    if (startLabel && labelMap[startLabel] !== undefined) {
      startIndex = labelMap[startLabel];
      log("初回起動: startLabel =", startLabel, "→ index", startIndex);
    } else if (initialStartIndex > 0) {
      startIndex = initialStartIndex;
      log("初回起動: startIndex =", startIndex);
    } else {
      log("初回起動: index 0 から開始, スクリプト長 =", scriptRef.current.length, ", ラベル =", Object.keys(labelMap));
    }
    proceedFrom(startIndex);
  }, []);

  // オートモード
  useEffect(() => {
    if (state.autoMode && !state.isTyping && !state.showChoice && !state.isWaiting && !state.activeEffect) {
      autoRef.current = setTimeout(() => advance(), state.autoDelay);
    }
    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    };
  }, [state.autoMode, state.isTyping, state.showChoice, state.isWaiting, state.activeEffect, state.displayedText, advance, state.autoDelay]);

  // スキップ判定
  const isSkipping = state.skipMode || state.ctrlPressed;

  // スキップループ
  useEffect(() => {
    if (isSkipping && !state.showChoice && !state.isWaiting && !state.activeEffect) {
      skipRef.current = setInterval(() => {
        advance();
      }, 50);
    }
    return () => {
      if (skipRef.current) {
        clearInterval(skipRef.current);
        skipRef.current = null;
      }
    };
  }, [isSkipping, state.showChoice, state.isWaiting, state.activeEffect, advance]);

  // キーボード操作
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Control") {
        dispatch({ type: ACTION.SET_CTRL_PRESSED, payload: true });
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
      if (e.key === "Escape") dispatch({ type: ACTION.CLOSE_ALL_UI });
    };
    const onKeyUp = (e) => {
      if (e.key === "Control") {
        dispatch({ type: ACTION.SET_CTRL_PRESSED, payload: false });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [advance]);

  // 背景トランジション終了
  useEffect(() => {
    if (state.bgTransition) {
      const t = setTimeout(() => dispatch({ type: ACTION.BG_TRANSITION_END }), 800);
      return () => clearTimeout(t);
    }
  }, [state.bgTransition]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        fontFamily: "'Noto Serif JP', 'Yu Mincho', 'HGS明朝E', serif",
        userSelect: "none",
      }}
      onClick={advance}
    >
      <Background
        currentBg={state.currentBg}
        prevBg={state.prevBg}
        bgTransition={state.bgTransition}
        bgTransitionType={state.bgTransitionType}
        bgTransitionTime={state.bgTransitionTime}
        bgStyles={bgStyles}
      />

      {Object.entries(state.characters).map(([id, chara]) => (
        <Character
          key={id}
          id={id}
          position={chara.position}
          expression={chara.expression}
          animState={chara.animState}
          charaData={characters}
          projectId={projectId}
        />
      ))}

      {/* 画面エフェクト */}
      <ScreenEffects
        effect={state.activeEffect}
        screenOverlay={state.screenOverlay}
        onEffectEnd={onEffectEnd}
        containerRef={containerRef}
      />

      {/* 上部左: 戻るボタン + BGM */}
      <div style={{
        position: "absolute", top: 12, left: 16, zIndex: 20,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        {onBack && (
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            style={{
              fontSize: 11, color: "rgba(200,180,140,0.6)",
              fontFamily: "'Noto Serif JP', serif",
              background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 12,
              cursor: "pointer", border: "none", transition: "all 0.2s",
            }}
          >
            ← BACK
          </button>
        )}
        {state.bgmPlaying && (
          <div style={{
            fontSize: 11, color: "rgba(200,180,140,0.5)",
            fontFamily: "'Noto Serif JP', serif",
            background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 12,
          }}>
            ♪ {typeof state.bgmPlaying === "string" ? state.bgmPlaying : state.bgmPlaying?.name}
          </div>
        )}
      </div>

      {/* 上部右: ステータスインジケーター（flex で重なり回避） */}
      <div style={{
        position: "absolute", top: 12, right: 16, zIndex: 20,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        {isSkipping && (
          <div style={{
            fontSize: 11, color: "#E8D4B0",
            fontFamily: "'Noto Serif JP', serif",
            background: "rgba(180,100,80,0.4)", padding: "3px 10px", borderRadius: 12,
          }}>
            {">> SKIP"}
          </div>
        )}
        {state.autoMode && (
          <div style={{
            fontSize: 11, color: "#E8D4B0",
            fontFamily: "'Noto Serif JP', serif",
            background: "rgba(200,180,140,0.3)", padding: "3px 10px", borderRadius: 12,
            animation: "pulse 2s infinite",
          }}>
            ▶ AUTO
          </div>
        )}
        {state.isWaiting && !isSkipping && (
          <div style={{
            fontSize: 11, color: "#E8D4B0",
            fontFamily: "'Noto Serif JP', serif",
            background: "rgba(180,150,80,0.35)", padding: "3px 10px", borderRadius: 12,
            animation: "pulse 1s infinite",
          }}>
            WAIT...
          </div>
        )}
      </div>

      {/* CG オーバーレイ */}
      {state.showCG && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 45,
          background: "rgba(0,0,0,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <img
            src={getAssetUrl(projectId, "cg", state.showCG.src) || `./assets/${state.showCG.src}`}
            alt=""
            style={{ maxWidth: "95%", maxHeight: "95%", objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentNode.querySelector("span") && (e.target.parentNode.querySelector("span").style.display = "block");
            }}
          />
          <span style={{ display: "none", color: "#888", fontSize: 14 }}>
            CG: {state.showCG.id} ({state.showCG.src})
          </span>
          <div style={{
            position: "absolute", bottom: 20, right: 20,
            color: "rgba(255,255,255,0.4)", fontSize: 12,
          }}>
            Click to continue
          </div>
        </div>
      )}

      {/* テキストボックス（ADV / NVL 切替） */}
      {state.nvlMode ? (
        <NVLTextBox
          nvlLog={state.nvlLog}
          currentSpeaker={state.currentSpeaker}
          currentText={state.displayedText}
          isTyping={state.isTyping}
        />
      ) : (
        <TextBox
          speaker={state.currentSpeaker}
          text={state.displayedText}
          isTyping={state.isTyping}
          showChoice={state.showChoice}
        />
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 11, padding: "0 32px 20px" }}>
        <Controls autoMode={state.autoMode} skipMode={state.skipMode} dispatch={dispatch} onHelp={() => setShowHelp(true)} />
      </div>

      {state.showChoice && <ChoiceOverlay options={state.choiceOptions} onChoice={handleChoice} />}
      {state.showBacklog && <BacklogView backlog={state.backlog} dispatch={dispatch} />}
      {state.showSaveLoad && (
        <SaveLoadView
          saves={state.saves}
          mode={state.saveLoadMode}
          dispatch={dispatch}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      )}
      {state.showConfig && (
        <div style={{ position: "absolute", inset: 0, zIndex: 40 }}>
          <ConfigView
            textSpeed={state.textSpeed}
            volumeMaster={state.volumeMaster}
            volumeBGM={state.volumeBGM}
            volumeSE={state.volumeSE}
            screenSize={initialConfig?.screenSize}
            dispatch={(action) => {
              if (action.type === "SET_SCREEN_SIZE") {
                if (onConfigChange) onConfigChange({ screenSize: action.payload });
                return;
              }
              dispatch(action);
              // 音量・速度変更も上位に通知
              const map = {
                SET_TEXT_SPEED: "textSpeed",
                SET_VOLUME_MASTER: "volumeMaster",
                SET_VOLUME_BGM: "volumeBGM",
                SET_VOLUME_SE: "volumeSE",
              };
              const key = map[action.type];
              if (key && onConfigChange) onConfigChange({ [key]: action.payload });
            }}
          />
        </div>
      )}

      {showHelp && <HelpModal {...NOVEL_HELP} onClose={() => setShowHelp(false)} />}

      {/* CSS アニメーション */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap');
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes charaEnter { from { opacity: 0; transform: translateX(-50%) translateY(30px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes charaExit { to { opacity: 0; transform: translateX(-50%) translateY(20px); } }
        @keyframes charaReact { 25% { transform: translateX(-52%); } 75% { transform: translateX(-48%); } 100% { transform: translateX(-50%); } }
        @keyframes charaShake { 0%,100% { transform: translateX(-50%); } 15% { transform: translateX(-54%); } 30% { transform: translateX(-46%); } 45% { transform: translateX(-53%); } 60% { transform: translateX(-47%); } 75% { transform: translateX(-51%); } }
        @keyframes charaBounce { 0% { transform: translateX(-50%) translateY(0); } 30% { transform: translateX(-50%) translateY(-20px); } 50% { transform: translateX(-50%) translateY(0); } 70% { transform: translateX(-50%) translateY(-8px); } 100% { transform: translateX(-50%) translateY(0); } }
        @keyframes charaZoom { 0% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.08); } 100% { transform: translateX(-50%) scale(1); } }
        @keyframes charaNod { 0%,100% { transform: translateX(-50%) translateY(0); } 40% { transform: translateX(-50%) translateY(8px); } 60% { transform: translateX(-50%) translateY(8px); } }
        @keyframes charaTremble { 0%,100% { transform: translateX(-50%); } 10% { transform: translateX(-51%); } 20% { transform: translateX(-49%); } 30% { transform: translateX(-51.5%); } 40% { transform: translateX(-48.5%); } 50% { transform: translateX(-51%); } 60% { transform: translateX(-49%); } 70% { transform: translateX(-50.5%); } 80% { transform: translateX(-49.5%); } 90% { transform: translateX(-50.5%); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(200,180,140,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
