import { useState, useCallback } from "react";
import { CMD } from "../engine/constants";
import ScriptList from "./ScriptList";
import CommandEditor from "./CommandEditor";
import PreviewPanel from "./PreviewPanel";

// 編集用の初期スクリプト（空テンプレート）
const DEFAULT_SCRIPT = [
  { type: "bg", src: "school_gate", transition: "fade" },
  { type: "dialog", speaker: "", text: "ここにテキストを入力…" },
];

export default function EditorScreen({ onBack, initialScript }) {
  const [script, setScript] = useState(initialScript || DEFAULT_SCRIPT);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(null);

  // コマンド更新
  const updateCommand = useCallback((index, updated) => {
    setScript((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });
  }, []);

  // コマンド追加
  const addCommand = useCallback((type, afterIndex) => {
    const templates = {
      [CMD.DIALOG]: { type: CMD.DIALOG, speaker: "", text: "" },
      [CMD.BG]: { type: CMD.BG, src: "", transition: "fade" },
      [CMD.CHARA]: { type: CMD.CHARA, id: "", position: "center", expression: "neutral" },
      [CMD.CHARA_MOD]: { type: CMD.CHARA_MOD, id: "", expression: "" },
      [CMD.CHARA_HIDE]: { type: CMD.CHARA_HIDE, id: "" },
      [CMD.CHOICE]: { type: CMD.CHOICE, options: [{ text: "選択肢1", jump: 0 }, { text: "選択肢2", jump: 0 }] },
      [CMD.BGM]: { type: CMD.BGM, name: "", loop: true },
      [CMD.BGM_STOP]: { type: CMD.BGM_STOP, fadeout: 1000 },
      [CMD.SE]: { type: CMD.SE, name: "" },
      [CMD.EFFECT]: { type: CMD.EFFECT, name: "fade", color: "#000", time: 1000 },
      [CMD.WAIT]: { type: CMD.WAIT, time: 1000 },
      [CMD.JUMP]: { type: CMD.JUMP, target: 0 },
      [CMD.LABEL]: { type: CMD.LABEL, name: "" },
    };
    const newCmd = templates[type] || { type: CMD.DIALOG, speaker: "", text: "" };
    setScript((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newCmd);
      return next;
    });
    setSelectedIndex(afterIndex + 1);
  }, []);

  // コマンド削除
  const removeCommand = useCallback((index) => {
    setScript((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // コマンド並べ替え
  const moveCommand = useCallback((index, direction) => {
    setScript((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex((prev) => {
      const target = prev + direction;
      return Math.max(0, Math.min(script.length - 1, target));
    });
  }, [script.length]);

  // JSON エクスポート
  const exportScript = useCallback(() => {
    const json = JSON.stringify(script, null, 2);
    const blob = new Blob([`const SCRIPT = ${json};\n\nexport default SCRIPT;\n`], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.js";
    a.click();
    URL.revokeObjectURL(url);
  }, [script]);

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.headerBtn}>
          ← 戻る
        </button>
        <span style={styles.headerTitle}>スクリプトエディタ</span>
        <div style={styles.headerRight}>
          <span style={styles.cmdCount}>{script.length} コマンド</span>
          <button onClick={exportScript} style={styles.headerBtn}>
            エクスポート
          </button>
          <button
            onClick={() => setPreviewIndex(previewIndex !== null ? null : 0)}
            style={{ ...styles.headerBtn, ...(previewIndex !== null ? styles.headerBtnActive : {}) }}
          >
            プレビュー
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div style={styles.main}>
        {/* 左: スクリプトリスト */}
        <div style={styles.leftPanel}>
          <ScriptList
            script={script}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onAdd={addCommand}
            onRemove={removeCommand}
            onMove={moveCommand}
          />
        </div>

        {/* 中央: コマンド編集 */}
        <div style={styles.centerPanel}>
          {script[selectedIndex] ? (
            <CommandEditor
              command={script[selectedIndex]}
              index={selectedIndex}
              onChange={(updated) => updateCommand(selectedIndex, updated)}
            />
          ) : (
            <div style={styles.emptyState}>コマンドを選択してください</div>
          )}
        </div>

        {/* 右: プレビュー（トグル） */}
        {previewIndex !== null && (
          <div style={styles.rightPanel}>
            <PreviewPanel script={script} startIndex={previewIndex} />
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#1a1a2e",
    color: "#E8E4DC",
    fontFamily: "'Noto Serif JP', 'Yu Mincho', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    background: "#0f0f1a",
    borderBottom: "1px solid rgba(200,180,140,0.15)",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 15,
    color: "#E8D4B0",
    letterSpacing: 2,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#ccc",
    padding: "5px 14px",
    borderRadius: 3,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
  headerBtnActive: {
    background: "rgba(90,180,255,0.2)",
    borderColor: "rgba(90,180,255,0.4)",
    color: "#5BF",
  },
  cmdCount: {
    fontSize: 11,
    color: "#888",
    fontFamily: "monospace",
    marginRight: 8,
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: 280,
    flexShrink: 0,
    borderRight: "1px solid rgba(200,180,140,0.1)",
    overflowY: "auto",
    background: "#12121f",
  },
  centerPanel: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
  },
  rightPanel: {
    width: 400,
    flexShrink: 0,
    borderLeft: "1px solid rgba(200,180,140,0.1)",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginTop: 80,
  },
};
