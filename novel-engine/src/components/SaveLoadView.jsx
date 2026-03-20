import { ACTION } from "../engine/constants";

export default function SaveLoadView({ saves, mode, dispatch }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: "rgba(10,10,20,0.95)",
        padding: "24px 32px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ color: "#E8D4B0", fontSize: 18, letterSpacing: 3 }}>
          {mode === "save" ? "セーブ" : "ロード"}
        </span>
        <button
          onClick={() => dispatch({ type: ACTION.HIDE_SAVELOAD })}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {saves.map((save, i) => (
          <button
            key={i}
            onClick={() => {
              if (mode === "save") dispatch({ type: ACTION.SAVE_GAME, payload: { slot: i } });
              else if (save) dispatch({ type: ACTION.LOAD_GAME, payload: { slot: i } });
            }}
            style={{
              background: save ? "rgba(200,180,140,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${save ? "rgba(200,180,140,0.3)" : "rgba(255,255,255,0.08)"}`,
              padding: "16px 20px",
              borderRadius: 4,
              cursor: save || mode === "save" ? "pointer" : "default",
              textAlign: "left",
              transition: "all 0.2s",
              opacity: !save && mode === "load" ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (save || mode === "save") e.target.style.background = "rgba(200,180,140,0.15)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = save ? "rgba(200,180,140,0.08)" : "rgba(255,255,255,0.03)";
            }}
          >
            <div style={{ color: "#C8A870", fontSize: 14, marginBottom: 4 }}>スロット {i + 1}</div>
            {save ? (
              <div style={{ color: "#999", fontSize: 12 }}>
                {save.date} — {save.speaker && `【${save.speaker}】`}
                {save.text?.substring(0, 30)}…
              </div>
            ) : (
              <div style={{ color: "#555", fontSize: 12 }}>— Empty —</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
