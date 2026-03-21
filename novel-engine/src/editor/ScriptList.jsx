import { CMD } from "../engine/constants";
import { useState } from "react";

// コマンドタイプ別の表示ラベルと色
const CMD_META = {
  [CMD.DIALOG]:     { label: "台詞",   color: "#8BC34A" },
  [CMD.BG]:         { label: "背景",   color: "#29B6F6" },
  [CMD.BGM]:        { label: "BGM",    color: "#CE93D8" },
  [CMD.BGM_STOP]:   { label: "BGM停",  color: "#CE93D8" },
  [CMD.SE]:         { label: "SE",     color: "#F48FB1" },
  [CMD.CHARA]:      { label: "キャラ", color: "#FFB74D" },
  [CMD.CHARA_MOD]:  { label: "表情",   color: "#FFB74D" },
  [CMD.CHARA_HIDE]: { label: "退場",   color: "#FFB74D" },
  [CMD.CHOICE]:     { label: "選択肢", color: "#FFF176" },
  [CMD.EFFECT]:     { label: "効果",   color: "#80DEEA" },
  [CMD.WAIT]:       { label: "待機",   color: "#90A4AE" },
  [CMD.JUMP]:       { label: "ジャンプ", color: "#EF5350" },
  [CMD.LABEL]:      { label: "ラベル", color: "#A5D6A7" },
};

// コマンドの1行サマリー
function commandSummary(cmd) {
  switch (cmd.type) {
    case CMD.DIALOG:
      return cmd.speaker
        ? `【${cmd.speaker}】${cmd.text?.substring(0, 20) || ""}…`
        : (cmd.text?.substring(0, 28) || "") + "…";
    case CMD.BG:        return cmd.src || "(未設定)";
    case CMD.BGM:       return cmd.name || "(未設定)";
    case CMD.BGM_STOP:  return `fade: ${cmd.fadeout || 0}ms`;
    case CMD.SE:        return cmd.name || "(未設定)";
    case CMD.CHARA:     return `${cmd.id || "?"} [${cmd.position}]`;
    case CMD.CHARA_MOD: return `${cmd.id || "?"} → ${cmd.expression || "?"}`;
    case CMD.CHARA_HIDE:return cmd.id || "(未設定)";
    case CMD.CHOICE:    return `${cmd.options?.length || 0}択`;
    case CMD.EFFECT:    return cmd.name || "(未設定)";
    case CMD.WAIT:      return `${cmd.time || 0}ms`;
    case CMD.JUMP:      return `→ ${cmd.target}`;
    case CMD.LABEL:     return cmd.name || "(未設定)";
    default:            return cmd.type;
  }
}

export default function ScriptList({ script, selectedIndex, onSelect, onAdd, onRemove, onMove, onPlayFrom }) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, index }

  const cmdTypes = Object.keys(CMD_META);

  return (
    <div style={styles.container}>
      {/* ツールバー */}
      <div style={styles.toolbar}>
        <span style={styles.toolbarLabel}>スクリプト</span>
        <div style={styles.toolbarBtns}>
          <button onClick={() => onMove(selectedIndex, -1)} style={styles.toolBtn} title="上に移動">↑</button>
          <button onClick={() => onMove(selectedIndex, 1)} style={styles.toolBtn} title="下に移動">↓</button>
          <button onClick={() => onRemove(selectedIndex)} style={styles.toolBtn} title="削除">✕</button>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{ ...styles.toolBtn, ...(showAddMenu ? styles.toolBtnActive : {}) }}
            title="追加"
          >
            ＋
          </button>
        </div>
      </div>

      {/* 追加メニュー */}
      {showAddMenu && (
        <div style={styles.addMenu}>
          {cmdTypes.map((type) => {
            const meta = CMD_META[type];
            return (
              <button
                key={type}
                onClick={() => { onAdd(type, selectedIndex); setShowAddMenu(false); }}
                style={styles.addMenuItem}
              >
                <span style={{ ...styles.badge, background: meta.color + "33", color: meta.color }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* コマンドリスト */}
      <div style={styles.list} onClick={() => setContextMenu(null)}>
        {script.map((cmd, i) => {
          const meta = CMD_META[cmd.type] || { label: cmd.type, color: "#888" };
          const selected = i === selectedIndex;
          return (
            <div
              key={i}
              onClick={() => onSelect(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, index: i });
              }}
              style={{
                ...styles.item,
                background: selected ? "rgba(200,180,140,0.1)" : "transparent",
                borderLeft: selected ? "3px solid #E8D4B0" : "3px solid transparent",
              }}
            >
              <span style={styles.index}>{i}</span>
              <span style={{ ...styles.badge, background: meta.color + "22", color: meta.color }}>
                {meta.label}
              </span>
              <span style={styles.summary}>{commandSummary(cmd)}</span>
            </div>
          );
        })}
      </div>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onPlayFrom && (
            <button
              style={styles.contextMenuItem}
              onClick={() => { onPlayFrom(contextMenu.index); setContextMenu(null); }}
            >
              ▶ この行から再生
            </button>
          )}
          <button
            style={styles.contextMenuItem}
            onClick={() => { onSelect(contextMenu.index); setContextMenu(null); }}
          >
            編集
          </button>
          <button
            style={styles.contextMenuItem}
            onClick={() => { onRemove(contextMenu.index); setContextMenu(null); }}
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  toolbarLabel: {
    fontSize: 12,
    color: "#C8A870",
    letterSpacing: 1,
  },
  toolbarBtns: {
    display: "flex",
    gap: 2,
  },
  toolBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    width: 26,
    height: 26,
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
  toolBtnActive: {
    background: "rgba(90,180,255,0.2)",
    borderColor: "rgba(90,180,255,0.4)",
    color: "#5BF",
  },
  addMenu: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
  },
  addMenuItem: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 3,
    padding: "3px 6px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  list: {
    flex: 1,
    overflowY: "auto",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    cursor: "pointer",
    transition: "background 0.15s",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  index: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    width: 20,
    textAlign: "right",
    flexShrink: 0,
  },
  badge: {
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 3,
    fontWeight: 600,
    flexShrink: 0,
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 12,
    color: "#999",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  contextMenu: {
    position: "fixed",
    zIndex: 1000,
    background: "#1e1e30",
    border: "1px solid rgba(200,180,140,0.3)",
    borderRadius: 4,
    padding: 4,
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    minWidth: 160,
  },
  contextMenuItem: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "#ccc",
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    borderRadius: 3,
    transition: "background 0.15s",
  },
};
