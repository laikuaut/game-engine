import { useState } from "react";

// 汎用ヘルプモーダル
// sections: [{ title: string, content: string | string[] }]
export default function HelpModal({ title, sections, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{title || "ヘルプ"}</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.body}>
          {(sections || []).map((section, i) => (
            <div key={i} style={styles.section}>
              {section.title && <div style={styles.sectionTitle}>{section.title}</div>}
              {Array.isArray(section.content) ? (
                section.content.map((line, j) => (
                  <div key={j} style={styles.line}>{line}</div>
                ))
              ) : (
                <div style={styles.line}>{section.content}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ヘルプボタン（? アイコン）
export function HelpButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.helpBtn,
        background: hovered ? "rgba(200,180,140,0.2)" : "rgba(255,255,255,0.06)",
        color: hovered ? "#E8D4B0" : "#888",
      }}
      title="ヘルプ"
    >
      ?
    </button>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    width: "90%", maxWidth: 600, maxHeight: "80vh",
    background: "rgba(15,15,25,0.98)",
    border: "1px solid rgba(200,180,140,0.25)",
    borderRadius: 8, overflow: "hidden",
    display: "flex", flexDirection: "column",
    fontFamily: "'Noto Serif JP', serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 24px", borderBottom: "1px solid rgba(200,180,140,0.15)",
    flexShrink: 0,
  },
  title: {
    color: "#E8D4B0", fontSize: 16, letterSpacing: 2,
  },
  closeBtn: {
    background: "none", border: "none",
    color: "#888", fontSize: 18, cursor: "pointer",
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  },
  body: {
    flex: 1, overflowY: "auto", padding: "16px 24px 24px",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#C8A870", fontSize: 13, letterSpacing: 1, marginBottom: 6,
    borderBottom: "1px solid rgba(200,180,140,0.1)", paddingBottom: 4,
  },
  line: {
    color: "#bbb", fontSize: 13, lineHeight: 1.8,
    paddingLeft: 8,
  },
  helpBtn: {
    border: "1px solid rgba(200,180,140,0.25)",
    width: 26, height: 26, borderRadius: "50%",
    fontSize: 13, fontWeight: "bold", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s", fontFamily: "inherit",
  },
};
