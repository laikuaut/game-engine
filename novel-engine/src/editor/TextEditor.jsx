import { useState, useMemo } from "react";
import { CMD } from "../engine/constants";

// シナリオ内の dialog コマンドを一覧表示してテキスト編集するビュー
export default function TextEditor({ script, onUpdateScript }) {
  const [filter, setFilter] = useState("");

  // dialog コマンドだけ抽出（元の index 付き）
  const dialogs = useMemo(() => {
    return script
      .map((cmd, i) => ({ cmd, index: i }))
      .filter(({ cmd }) => cmd.type === CMD.DIALOG);
  }, [script]);

  // フィルター適用
  const filtered = useMemo(() => {
    if (!filter) return dialogs;
    const q = filter.toLowerCase();
    return dialogs.filter(
      ({ cmd }) =>
        (cmd.speaker || "").toLowerCase().includes(q) ||
        (cmd.text || "").toLowerCase().includes(q)
    );
  }, [dialogs, filter]);

  const updateField = (scriptIndex, field, value) => {
    const newScript = [...script];
    newScript[scriptIndex] = { ...newScript[scriptIndex], [field]: value };
    onUpdateScript(newScript);
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <span style={styles.title}>テキスト編集</span>
        <span style={styles.count}>
          {filtered.length} / {dialogs.length} 件
        </span>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="話者 / テキストで検索..."
          style={styles.search}
        />
      </div>

      {/* テキストリスト */}
      <div style={styles.list}>
        {filtered.map(({ cmd, index }) => (
          <div key={index} style={styles.row}>
            <div style={styles.rowHeader}>
              <span style={styles.rowIndex}>#{index}</span>
              <input
                type="text"
                value={cmd.speaker || ""}
                onChange={(e) => updateField(index, "speaker", e.target.value)}
                placeholder="話者（空欄でナレーション）"
                style={styles.speakerInput}
              />
            </div>
            <textarea
              value={cmd.text || ""}
              onChange={(e) => updateField(index, "text", e.target.value)}
              placeholder="セリフを入力..."
              style={styles.textArea}
              rows={Math.max(2, (cmd.text || "").split("\n").length)}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={styles.empty}>
            {filter ? "一致するテキストがありません" : "dialog コマンドがありません"}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    borderBottom: "1px solid rgba(200,180,140,0.1)",
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    color: "#C8A870",
    letterSpacing: 1,
    flexShrink: 0,
  },
  count: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  search: {
    flex: 1,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#E8E4DC",
    padding: "5px 10px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px",
  },
  row: {
    marginBottom: 12,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4,
  },
  rowHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  rowIndex: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    width: 30,
    flexShrink: 0,
  },
  speakerInput: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(200,180,140,0.15)",
    color: "#E8D4B0",
    padding: "4px 8px",
    borderRadius: 3,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    width: 140,
  },
  textArea: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#E8E4DC",
    padding: "8px 10px",
    borderRadius: 3,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    lineHeight: 1.8,
    resize: "vertical",
    boxSizing: "border-box",
  },
  empty: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
};
