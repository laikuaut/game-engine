import { ACTION } from "../engine/constants";

export default function BacklogView({ backlog, dispatch }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: "rgba(10,10,20,0.95)",
        overflowY: "auto",
        padding: "24px 32px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ color: "#E8D4B0", fontSize: 18, letterSpacing: 3 }}>バックログ</span>
        <button
          onClick={() => dispatch({ type: ACTION.TOGGLE_BACKLOG })}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#aaa",
            padding: "4px 16px",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          閉じる
        </button>
      </div>
      {backlog.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>ログはまだありません</p>
      ) : (
        [...backlog].reverse().map((entry, i) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {entry.speaker && (
              <span style={{ color: "#C8A870", fontSize: 13, marginRight: 12 }}>
                【{entry.speaker}】
              </span>
            )}
            <span style={{ color: "#ccc", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {entry.text}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
