import { useState, useCallback, useReducer, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { CMD, ACTION } from "../engine/constants";
import { engineReducer, initialState } from "../engine/reducer";
import { processCommand, buildLabelMap, expandScenes } from "../engine/commands";
import Background from "../components/Background";
import Character from "../components/Character";

// エディタ内のミニプレビュー（読み取り専用のエンジン表示）
const PreviewPanel = forwardRef(function PreviewPanel({ script, storyScenes, characters, bgStyles, projectId }, ref) {
  const [state, dispatch] = useReducer(engineReducer, initialState);
  const [currentLine, setCurrentLine] = useState(0);

  // シーン参照を展開 + インデックスマッピング構築
  const { expandedScript, indexMap } = useMemo(() => {
    const expanded = expandScenes(script, storyScenes);
    const map = [];
    let ei = 0;
    for (let si = 0; si < (script || []).length; si++) {
      map[si] = ei;
      const cmd = script[si];
      if (cmd.type === "scene") {
        const scene = (storyScenes || []).find((s) => s.id === cmd.sceneId);
        ei += scene ? 1 + scene.commands.length : 0;
      } else {
        ei += 1;
      }
    }
    return { expandedScript: expanded, indexMap: map };
  }, [script, storyScenes]);
  const labelMap = useMemo(() => buildLabelMap(expandedScript), [expandedScript]);

  // ref で最新値を保持（命令的 API 用）
  const expandedRef = useRef(expandedScript);
  const labelMapRef = useRef(labelMap);
  const indexMapRef = useRef(indexMap);
  expandedRef.current = expandedScript;
  labelMapRef.current = labelMap;
  indexMapRef.current = indexMap;

  // 指定 index（展開後）からプレビュー実行
  const runFromIndex = useCallback((fromIndex) => {
    const es = expandedRef.current;
    const lm = labelMapRef.current;
    dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: "" });
    dispatch({ type: ACTION.SET_SPEAKER, payload: "" });
    if (es.length === 0 || fromIndex >= es.length) return;
    const result = processCommand(es, fromIndex, dispatch, lm);
    const i = result.index;
    if (i < es.length && es[i]?.type === CMD.DIALOG) {
      dispatch({ type: ACTION.SET_SPEAKER, payload: es[i].speaker });
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: es[i].text });
    }
    setCurrentLine(i);
    if (result.blocking) {
      if (result.blocking === "wait") dispatch({ type: ACTION.END_WAIT });
      if (result.blocking === "effect") dispatch({ type: ACTION.EFFECT_END });
      if (result.blocking === "cg") dispatch({ type: ACTION.HIDE_CG });
    }
  }, []);

  // 親から呼べる命令的 API
  useImperativeHandle(ref, () => ({
    jumpTo: (originalIndex) => {
      const mapped = indexMapRef.current[originalIndex];
      runFromIndex(mapped !== undefined ? mapped : originalIndex);
    },
    jumpToSceneChild: (parentIndex, childIndex) => {
      const mapped = indexMapRef.current[parentIndex];
      runFromIndex((mapped !== undefined ? mapped : parentIndex) + 1 + childIndex);
    },
  }), [runFromIndex]);

  // 次のコマンドへ進む
  const advancePreview = useCallback(() => {
    const es = expandedRef.current;
    const lm = labelMapRef.current;
    let next = currentLine + 1;
    if (next >= es.length) return;
    const result = processCommand(es, next, dispatch, lm);
    next = result.index;
    if (next >= es.length) return;
    setCurrentLine(next);
    const cmd = es[next];
    if (cmd.type === CMD.DIALOG) {
      dispatch({ type: ACTION.SET_SPEAKER, payload: cmd.speaker });
      dispatch({ type: ACTION.SET_DISPLAYED_TEXT, payload: cmd.text });
    }
    if (result.blocking) {
      if (result.blocking === "wait") dispatch({ type: ACTION.END_WAIT });
      if (result.blocking === "effect") dispatch({ type: ACTION.EFFECT_END });
      if (result.blocking === "cg") dispatch({ type: ACTION.HIDE_CG });
    }
  }, [currentLine]);

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
          bgStyles={bgStyles}
        />

        {Object.entries(state.characters).map(([id, chara]) => (
          <Character key={id} id={id} position={chara.position} expression={chara.expression} animState={chara.animState} charaData={characters} projectId={projectId} />
        ))}

        {state.bgmPlaying && (
          <div style={styles.bgmIndicator}>♪ {typeof state.bgmPlaying === "string" ? state.bgmPlaying : state.bgmPlaying.name}</div>
        )}

        <div style={styles.textBox}>
          {state.currentSpeaker && (
            <div style={styles.speaker}>{state.currentSpeaker}</div>
          )}
          <div style={styles.text}>{state.displayedText}</div>
        </div>

        <div style={styles.clickHint}>click to advance</div>
      </div>
    </div>
  );
});

export default PreviewPanel;

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
