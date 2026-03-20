import { useEffect, useRef, useCallback, useReducer } from "react";
import { ACTION, CMD } from "./constants";
import { engineReducer, initialState } from "./reducer";
import { processCommand } from "./commands";
import SCRIPT from "../data/script";
import Background from "../components/Background";
import Character from "../components/Character";
import TextBox from "../components/TextBox";
import Controls from "../components/Controls";
import ChoiceOverlay from "../components/ChoiceOverlay";
import BacklogView from "../components/BacklogView";
import SaveLoadView from "../components/SaveLoadView";
import ConfigView from "../components/ConfigView";

export default function NovelEngine() {
  const [state, dispatch] = useReducer(engineReducer, initialState);
  const typingRef = useRef(null);
  const autoRef = useRef(null);
  const fullTextRef = useRef("");
  const containerRef = useRef(null);

  // dialog / choice 以外を連続処理
  const runCommands = useCallback(
    (index) => processCommand(SCRIPT, index, dispatch),
    []
  );

  // テキストのタイプライター表示開始
  const startDialog = useCallback(
    (index) => {
      const cmd = SCRIPT[index];
      if (!cmd || cmd.type !== CMD.DIALOG) return;
      dispatch({ type: ACTION.SET_SPEAKER, payload: cmd.speaker });
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
    [state.textSpeed]
  );

  // テキスト送り
  const advance = useCallback(() => {
    if (state.showChoice || state.showBacklog || state.showConfig || state.showSaveLoad) return;
    if (state.isTyping) {
      if (typingRef.current) clearInterval(typingRef.current);
      typingRef.current = null;
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: fullTextRef.current });
      dispatch({ type: ACTION.SET_TYPING, payload: false });
      const cmd = SCRIPT[state.scriptIndex];
      if (cmd && cmd.type === CMD.DIALOG) {
        dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: cmd.speaker, text: cmd.text } });
      }
      return;
    }
    let nextIndex = state.scriptIndex + 1;
    if (nextIndex >= SCRIPT.length) return;
    nextIndex = runCommands(nextIndex);
    if (nextIndex >= SCRIPT.length) return;
    const cmd = SCRIPT[nextIndex];
    dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: nextIndex });
    if (cmd.type === CMD.DIALOG) {
      startDialog(nextIndex);
    } else if (cmd.type === CMD.CHOICE) {
      dispatch({ type: ACTION.SHOW_CHOICE, payload: cmd.options });
    }
  }, [
    state.scriptIndex, state.isTyping, state.showChoice,
    state.showBacklog, state.showConfig, state.showSaveLoad,
    runCommands, startDialog,
  ]);

  // 選択肢処理
  const handleChoice = useCallback(
    (option) => {
      dispatch({ type: ACTION.HIDE_CHOICE });
      dispatch({ type: ACTION.ADD_BACKLOG, payload: { speaker: "選択", text: option.text } });
      let nextIndex = option.jump;
      nextIndex = runCommands(nextIndex);
      if (nextIndex >= SCRIPT.length) return;
      dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: nextIndex });
      const cmd = SCRIPT[nextIndex];
      if (cmd.type === CMD.DIALOG) startDialog(nextIndex);
      else if (cmd.type === CMD.CHOICE) dispatch({ type: ACTION.SHOW_CHOICE, payload: cmd.options });
    },
    [runCommands, startDialog]
  );

  // 初回シーン処理
  useEffect(() => {
    let i = runCommands(0);
    if (i < SCRIPT.length) {
      dispatch({ type: ACTION.SET_SCRIPT_INDEX, payload: i });
      if (SCRIPT[i].type === CMD.DIALOG) startDialog(i);
    }
  }, []);

  // オートモード
  useEffect(() => {
    if (state.autoMode && !state.isTyping && !state.showChoice) {
      autoRef.current = setTimeout(() => advance(), state.autoDelay);
    }
    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    };
  }, [state.autoMode, state.isTyping, state.showChoice, state.displayedText, advance, state.autoDelay]);

  // キーボード操作
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
      if (e.key === "Escape") dispatch({ type: ACTION.CLOSE_ALL_UI });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
        maxWidth: 960,
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
      <Background currentBg={state.currentBg} bgTransition={state.bgTransition} />

      {Object.entries(state.characters).map(([id, chara]) => (
        <Character key={id} id={id} position={chara.position} expression={chara.expression} />
      ))}

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

      {/* テキストボックス + コントロール */}
      <TextBox
        speaker={state.currentSpeaker}
        text={state.displayedText}
        isTyping={state.isTyping}
        showChoice={state.showChoice}
      />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 11, padding: "0 32px 20px" }}>
        <Controls autoMode={state.autoMode} dispatch={dispatch} />
      </div>

      {state.showChoice && <ChoiceOverlay options={state.choiceOptions} onChoice={handleChoice} />}
      {state.showBacklog && <BacklogView backlog={state.backlog} dispatch={dispatch} />}
      {state.showSaveLoad && <SaveLoadView saves={state.saves} mode={state.saveLoadMode} dispatch={dispatch} />}
      {state.showConfig && <ConfigView textSpeed={state.textSpeed} dispatch={dispatch} />}

      {/* CSS アニメーション */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap');
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(200,180,140,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
