import { useState, useMemo } from "react";
import { CMD } from "../engine/constants";

// コマンドタイプ別のバッジ色
const CMD_COLORS = {
  [CMD.BG]: "#29B6F6",
  [CMD.BGM]: "#CE93D8",
  [CMD.SE]: "#F48FB1",
  [CMD.CHARA]: "#FFB74D",
  [CMD.CHARA_MOD]: "#FFB74D",
  [CMD.CHARA_HIDE]: "#FFB74D",
  [CMD.CHOICE]: "#FFF176",
  [CMD.EFFECT]: "#80DEEA",
  [CMD.WAIT]: "#90A4AE",
  [CMD.JUMP]: "#EF5350",
  [CMD.LABEL]: "#A5D6A7",
};

// コマンドの簡易表示
function cmdBrief(cmd) {
  switch (cmd.type) {
    case CMD.BG: return `背景: ${cmd.src || "?"}`;
    case CMD.BGM: return `BGM: ${cmd.name || "?"}`;
    case CMD.SE: return `SE: ${cmd.name || "?"}`;
    case CMD.CHARA: return `${cmd.id || "?"} 登場 [${cmd.position}]`;
    case CMD.CHARA_MOD: return `${cmd.id || "?"} → ${cmd.expression || "?"}`;
    case CMD.CHARA_HIDE: return `${cmd.id || "?"} 退場`;
    case CMD.CHOICE: return `選択肢 (${cmd.options?.length || 0}択)`;
    case CMD.EFFECT: return `効果: ${cmd.name || "?"}`;
    case CMD.WAIT: return `待機 ${cmd.time || 0}ms`;
    case CMD.JUMP: return `→ ${cmd.target}`;
    case CMD.LABEL: return `[${cmd.name || "?"}]`;
    default: return cmd.type;
  }
}

// シナリオ内のテキスト編集ビュー（構造コンテキスト付き）
export default function TextEditor({ script, onUpdateScript }) {
  const [filter, setFilter] = useState("");
  const [showStructure, setShowStructure] = useState(true);

  // dialog コマンドだけ抽出（元の index 付き）
  const dialogs = useMemo(() => {
    return script
      .map((cmd, i) => ({ cmd, index: i }))
      .filter(({ cmd }) => cmd.type === CMD.DIALOG);
  }, [script]);

  // 構造表示: dialog 以外のコマンドも含めた統合ビュー
  const structuredItems = useMemo(() => {
    if (!showStructure) return null;
    return script.map((cmd, i) => ({ cmd, index: i, isDialog: cmd.type === CMD.DIALOG }));
  }, [script, showStructure]);

  // フィルター適用
  const filtered = useMemo(() => {
    const items = showStructure ? structuredItems : dialogs.map((d) => ({ ...d, isDialog: true }));
    if (!filter) return items;
    const q = filter.toLowerCase();
    return items.filter(({ cmd, isDialog }) => {
      if (!isDialog) return false; // 構造コマンドはフィルタ時に非表示
      return (
        (cmd.speaker || "").toLowerCase().includes(q) ||
        (cmd.text || "").toLowerCase().includes(q)
      );
    });
  }, [dialogs, structuredItems, filter, showStructure]);

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
          {dialogs.length} 件
        </span>
        <button
          onClick={() => setShowStructure(!showStructure)}
          style={{
            ...styles.toggleBtn,
            ...(showStructure ? styles.toggleBtnActive : {}),
          }}
          title="構造表示の切替"
        >
          構造
        </button>
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
        {filtered.map(({ cmd, index, isDialog }) => {
          if (!isDialog) {
            // 構造コマンド（非dialog）をコンパクトに表示
            const color = CMD_COLORS[cmd.type] || "#888";
            return (
              <div key={`s-${index}`} style={styles.structureRow}>
                <span style={styles.rowIndex}>#{index}</span>
                <span style={{ ...styles.structureBadge, background: color + "22", color }}>
                  {cmdBrief(cmd)}
                </span>
              </div>
            );
          }
          return (
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
          );
        })}
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
  toggleBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#888",
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  toggleBtnActive: {
    background: "rgba(200,180,140,0.15)",
    borderColor: "rgba(200,180,140,0.3)",
    color: "#E8D4B0",
  },
  structureRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 14px",
    borderLeft: "3px solid rgba(255,255,255,0.06)",
    marginBottom: 2,
  },
  structureBadge: {
    fontSize: 10,
    padding: "1px 8px",
    borderRadius: 3,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
};
