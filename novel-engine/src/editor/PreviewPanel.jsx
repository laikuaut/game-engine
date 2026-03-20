import { useState, useCallback, useReducer, useEffect, useRef } from "react";
import { CMD, ACTION } from "../engine/constants";
import { engineReducer, initialState } from "../engine/reducer";
import { processCommand } from "../engine/commands";
import Background from "../components/Background";
import Character from "../components/Character";

// エディタ内のミニプレビュー（読み取り専用のエンジン表示）
export default function PreviewPanel({ script, startIndex }) {
  const [state, dispatch] = useReducer(engineReducer, initialState);
  const [currentLine, setCurrentLine] = useState(startIndex);
  const initialized = useRef(false);

  // スクリプト変更時にリセット＆再実行
  useEffect(() => {
    if (script.length === 0) return;
    // 初期コマンドを処理
    const i = processCommand(script, 0, dispatch);
    if (i < script.length && script[i].type === CMD.DIALOG) {
      dispatch({ type: ACTION.SET_SPEAKER, payload: script[i].speaker });
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: script[i].text });
    }
    setCurrentLine(i);
    initialized.current = true;
  }, [script]);

  // 次のコマンドへ進む
  const advancePreview = useCallback(() => {
    let next = currentLine + 1;
    if (next >= script.length) return;
    next = processCommand(script, next, dispatch);
    if (next >= script.length) return;
    setCurrentLine(next);
    const cmd = script[next];
    if (cmd.type === CMD.DIALOG) {
      dispatch({ type: ACTION.SET_SPEAKER, payload: cmd.speaker });
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: cmd.text });
    }
  }, [currentLine, script]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.label}>
        プレビュー — line {currentLine}/{script.length - 1}
      </div>
      <div style={styles.screen} onClick={advancePreview}>
        <Background currentBg={state.currentBg} bgTransition={state.bgTransition} />

        {Object.entries(state.characters).map(([id, chara]) => (
          <Character key={id} id={id} position={chara.position} expression={chara.expression} />
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
    padding: "20px 16px 12px",
  },
  speaker: {
    display: "inline-block",
    marginBottom: 4,
    background: "rgba(255,255,255,0.12)",
    padding: "1px 8px",
    borderRadius: 2,
    fontSize: 10,
    color: "#E8D4B0",
    letterSpacing: 1,
  },
  text: {
    fontSize: 11,
    lineHeight: 1.7,
    color: "#E8E4DC",
    whiteSpace: "pre-wrap",
    minHeight: 30,
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
