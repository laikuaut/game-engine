import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from "react";
import { ACTION, CMD } from "./constants";
import { engineReducer, initialState } from "./reducer";
import { processCommand, buildLabelMap, resolveTarget } from "./commands";
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

export default function NovelEngine({ script, characters, bgStyles, onBack, projectId }) {
  const SCRIPT = script || DEFAULT_SCRIPT;
  const [state, dispatch] = useReducer(engineReducer, initialState);
  // オーディオフック
  useAudio(state);

  const typingRef = useRef(null);
  const autoRef = useRef(null);
  const waitRef = useRef(null);
  const skipRef = useRef(null);
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

      if (blocking === "wait") {
        dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
        const cmd = scriptRef.current[index];
        const waitTime = cmd?.time || 1000;
        waitRef.current = setTimeout(() => {
          waitRef.current = null;
          dispatch({ type: ACTION.END_WAIT });
          // wait 完了 → 次のコマンドへ進む
          proceedFrom(index + 1);
        }, waitTime);
        return;
      }

      if (blocking === "effect") {
        dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
        return;
      }

      if (blocking === "cg") {
        dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
        // CG はクリックで閉じる → advance で処理
        return;
      }

      // blocking なし → dialog or choice or スクリプト終端
      if (index >= scriptRef.current.length) return;
      const cmd = scriptRef.current[index];
      dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: index });
      if (cmd.type === CMD.DIALOG) {
        startDialog(index);
      } else if (cmd.type === CMD.CHOICE) {
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
      if (index >= scriptRef.current.length) return;
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
        dispatch({ type: "ADD_NVL_TEXT", payload: { speaker: cmd.speaker, text: cmd.text } });
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
    if (state.showChoice || state.showBacklog || state.showConfig || state.showSaveLoad) return;

    // CG 表示中 → 閉じて次へ
    if (state.showCG) {
      unlockCG("cg", state.showCG.id);
      dispatch({ type: "HIDE_CG" });
      proceedFrom(state.scriptIndex + 1);
      return;
    }

    // wait 中のクリック → 即座にスキップ
    if (state.isWaiting) {
      if (waitRef.current) {
        clearTimeout(waitRef.current);
        waitRef.current = null;
      }
      dispatch({ type: ACTION.END_WAIT });
      proceedFrom(state.scriptIndex + 1);
      return;
    }

    // エフェクト中は無視
    if (state.activeEffect) return;

    // タイプ中 → 即座に全文表示
    if (state.isTyping) {
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
    proceedFrom(state.scriptIndex + 1);
  }, [
    state.scriptIndex, state.isTyping, state.isWaiting, state.activeEffect,
    state.showChoice, state.showBacklog, state.showConfig, state.showSaveLoad,
    proceedFrom,
  ]);

  // 選択肢処理
  const handleChoice = useCallback(
    (option) => {
      dispatch({ type: ACTION.HIDE_CHOICE });
      dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: "選択", text: option.text } });
      const jumpTarget = resolveTarget(option.jump, labelMap);
      if (jumpTarget < 0) return;
      proceedFrom(jumpTarget);
    },
    [labelMap, proceedFrom]
  );

  // セーブスロット初期ロード
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const slots = await listSlots(projectId);
      dispatch({ type: "SET_SAVES", payload: slots });
    })();
  }, [projectId]);

  // セーブ処理（永続化込み）
  const handleSave = useCallback(async (slot) => {
    dispatch({ type: ACTION.SAVE_GAME, payload: { slot } });
    if (projectId) {
      await saveGame(projectId, slot, state);
    }
  }, [projectId, state]);

  // ロード処理（永続化からフルデータ取得）
  const handleLoad = useCallback(async (slot) => {
    if (projectId) {
      const data = await loadGame(projectId, slot);
      if (data?.state) {
        dispatch({ type: ACTION.LOAD_GAME, payload: { slot, data: data.state } });
        return;
      }
    }
    // フォールバック: インメモリから
    dispatch({ type: ACTION.LOAD_GAME, payload: { slot } });
  }, [projectId]);

  // エフェクト完了コールバック
  const onEffectEnd = useCallback(() => {
    dispatch({ type: ACTION.EFFECT_END });
    proceedFrom(state.scriptIndex + 1);
  }, [state.scriptIndex, proceedFrom]);

  // キャラアニメーション管理
  useEffect(() => {
    const timers = [];
    Object.entries(state.characters).forEach(([id, chara]) => {
      if (chara.animState === "entering") {
        timers.push(setTimeout(() => dispatch({ type: "CHARA_ANIM_DONE", payload: id }), 500));
      } else if (chara.animState === "exiting") {
        timers.push(setTimeout(() => dispatch({ type: "REMOVE_CHARA_DONE", payload: id }), 400));
      } else if (chara.animState === "expression_change") {
        timers.push(setTimeout(() => dispatch({ type: "CHARA_ANIM_DONE", payload: id }), 300));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [state.characters]);

  // 初回シーン処理
  useEffect(() => {
    proceedFrom(0);
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
        maxWidth: 1920,
        margin: "0 auto",
        aspectRatio: "16/9",
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
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
        />
      ))}

      {/* 画面エフェクト */}
      <ScreenEffects
        effect={state.activeEffect}
        screenOverlay={state.screenOverlay}
        onEffectEnd={onEffectEnd}
        containerRef={containerRef}
      />

      {/* BGM インジケーター */}
      {state.bgmPlaying && (
        <div
          style={{
            position: "absolute", top: 12, left: 16, zIndex: 20,
            fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "monospace",
            background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 12,
          }}
        >
          ♪ {state.bgmPlaying}
        </div>
      )}

      {/* オートモードインジケーター */}
      {state.autoMode && (
        <div
          style={{
            position: "absolute", top: 12, right: 16, zIndex: 20,
            fontSize: 11, color: "#5BF", fontFamily: "monospace",
            background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: 12,
            animation: "pulse 2s infinite",
          }}
        >
          ▶ AUTO
        </div>
      )}

      {/* SKIP インジケーター */}
      {isSkipping && (
        <div
          style={{
            position: "absolute", top: 12, right: 16, zIndex: 20,
            fontSize: 11, color: "#F55", fontFamily: "monospace",
            background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: 12,
          }}
        >
          {">> SKIP"}
        </div>
      )}

      {/* WAIT インジケーター */}
      {state.isWaiting && !isSkipping && (
        <div
          style={{
            position: "absolute", top: 12, right: 16, zIndex: 20,
            fontSize: 11, color: "#FA0", fontFamily: "monospace",
            background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: 12,
            animation: "pulse 1s infinite",
          }}
        >
          WAIT...
        </div>
      )}

      {/* 戻るボタン */}
      {onBack && (
        <div
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          style={{
            position: "absolute", top: 12, left: state.bgmPlaying ? 140 : 16,
            zIndex: 20, fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace",
            background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 12,
            cursor: "pointer",
          }}
        >
          ← BACK
        </div>
      )}

      {/* CG オーバーレイ */}
      {state.showCG && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 45,
          background: "rgba(0,0,0,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <img
            src={`./assets/${state.showCG.src}`}
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
        <Controls autoMode={state.autoMode} skipMode={state.skipMode} dispatch={dispatch} />
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
        <ConfigView
          textSpeed={state.textSpeed}
          volumeMaster={state.volumeMaster}
          volumeBGM={state.volumeBGM}
          volumeSE={state.volumeSE}
          dispatch={dispatch}
        />
      )}

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
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(200,180,140,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
