import { useState, useCallback, useReducer, useEffect, useRef, useMemo } from "react";
import { CMD, ACTION } from "../engine/constants";
import { engineReducer, initialState } from "../engine/reducer";
import { processCommand, buildLabelMap, expandScenes } from "../engine/commands";
import Background from "../components/Background";
import Character from "../components/Character";

// エディタ内のミニプレビュー（読み取り専用のエンジン表示）
export default function PreviewPanel({ script, startIndex, storyScenes }) {
  const [state, dispatch] = useReducer(engineReducer, initialState);
  const [currentLine, setCurrentLine] = useState(startIndex || 0);
  const initialized = useRef(false);
  const prevStartIndex = useRef(startIndex || 0);

  // シーン参照を展開
  const expandedScript = useMemo(() => expandScenes(script, storyScenes), [script, storyScenes]);
  const labelMap = useMemo(() => buildLabelMap(expandedScript), [expandedScript]);

  // startIndex が外部から変更された場合にリセット
  useEffect(() => {
    if (startIndex !== prevStartIndex.current) {
      prevStartIndex.current = startIndex;
      runFromIndex(startIndex || 0);
    }
  }, [startIndex]);

  // 指定indexからプレビュー実行
  const runFromIndex = useCallback((fromIndex) => {
    // ステートをリセット
    dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: "" });
    dispatch({ type: ACTION.SET_SPEAKER, payload: "" });
    if (expandedScript.length === 0 || fromIndex >= expandedScript.length) return;
    const result = processCommand(expandedScript, fromIndex, dispatch, labelMap);
    const i = result.index;
    if (i < expandedScript.length && expandedScript[i].type === CMD.DIALOG) {
      dispatch({ type: ACTION.SET_SPEAKER, payload: expandedScript[i].speaker });
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: expandedScript[i].text });
    }
    setCurrentLine(i);
    if (result.blocking) {
      if (result.blocking === "wait") dispatch({ type: ACTION.END_WAIT });
      if (result.blocking === "effect") dispatch({ type: ACTION.EFFECT_END });
      if (result.blocking === "cg") dispatch({ type: ACTION.HIDE_CG });
    }
  }, [expandedScript, labelMap]);

  // スクリプト変更時にリセット＆再実行
  useEffect(() => {
    if (expandedScript.length === 0) return;
    runFromIndex(startIndex || 0);
    initialized.current = true;
  }, [expandedScript, labelMap]);

  // 次のコマンドへ進む
  const advancePreview = useCallback(() => {
    let next = currentLine + 1;
    if (next >= expandedScript.length) return;
    const result = processCommand(expandedScript, next, dispatch, labelMap);
    next = result.index;
    if (next >= expandedScript.length) return;
    setCurrentLine(next);
    const cmd = expandedScript[next];
    if (cmd.type === CMD.DIALOG) {
      dispatch({ type: ACTION.SET_SPEAKER, payload: cmd.speaker });
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: cmd.text });
    }
    // blocking コマンド（wait/effect/cg）はプレビューではスキップ
    if (result.blocking) {
      if (result.blocking === "wait") dispatch({ type: ACTION.END_WAIT });
      if (result.blocking === "effect") dispatch({ type: ACTION.EFFECT_END });
      if (result.blocking === "cg") dispatch({ type: ACTION.HIDE_CG });
    }
  }, [currentLine, expandedScript, labelMap]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.label}>
        プレビュー — line {currentLine}/{expandedScript.length - 1}
      </div>
      <div style={styles.screen} onClick={advancePreview}>
        <Background
          currentBg={state.currentBg}
          prevBg={state.prevBg}
          bgTransition={state.bgTransition}
          bgTransitionType={state.bgTransitionType}
          bgTransitionTime={state.bgTransitionTime}
        />

        {Object.entries(state.characters).map(([id, chara]) => (
          <Character key={id} id={id} position={chara.position} expression={chara.expression} animState={chara.animState} />
        ))}

        {/* BGM インジケーター */}
        {state.bgmPlaying && (
          <div style={styles.bgmIndicator}>♪ {state.bgmPlaying}</div>
        )}

        {/* テキスト表示 */}
        <div style={styles.textBox}>
          {state.currentSpeaker && (
            <div style={styles.speaker}>{state.currentSpeaker}</div>
          )}
          <div style={styles.text}>{state.displayedText}</div>
        </div>

        {/* クリック誘導 */}
        <div style={styles.clickHint}>click to advance</div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    padding: 16,
  },
  label: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
    marginBottom: 8,
    letterSpacing: 1,
  },
  screen: {
    width: "100%",
    aspectRatio: "16/9",
    position: "relative",
    overflow: "hidden",
    borderRadius: 4,
    border: "1px solid rgba(200,180,140,0.15)",
    cursor: "pointer",
    fontFamily: "'Noto Serif JP', serif",
    userSelect: "none",
  },
  bgmIndicator: {
    position: "absolute",
    top: 6,
    left: 8,
    zIndex: 20,
    fontSize: 8,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.3)",
    padding: "2px 6px",
    borderRadius: 8,
  },
  textBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: "linear-gradient(180deg, transparent 0%, rgba(10,10,20,0.9) 30%)",
    padding: "24px 20px 16px",
  },
  speaker: {
    display: "inline-block",
    marginBottom: 6,
    background: "rgba(255,255,255,0.12)",
    padding: "2px 10px",
    borderRadius: 2,
    fontSize: 13,
    color: "#E8D4B0",
    letterSpacing: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.8,
    color: "#E8E4DC",
    whiteSpace: "pre-wrap",
    minHeight: 40,
  },
  clickHint: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 8,
    color: "rgba(255,215,0,0.4)",
    fontFamily: "monospace",
  },
};
