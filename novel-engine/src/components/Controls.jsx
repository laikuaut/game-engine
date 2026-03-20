import { ACTION } from "../engine/constants";

const btnStyle = (active) => ({
  background: active ? "rgba(90,180,255,0.25)" : "rgba(255,255,255,0.08)",
  border: `1px solid ${active ? "rgba(90,180,255,0.5)" : "rgba(255,255,255,0.15)"}`,
  color: active ? "#5BF" : "rgba(255,255,255,0.55)",
  padding: "4px 14px",
  borderRadius: 3,
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.2s",
  letterSpacing: 1.5,
  fontFamily: "monospace",
});

export default function Controls({ autoMode, dispatch }) {
  const buttons = [
    { label: autoMode ? "AUTO ●" : "AUTO", action: ACTION.TOGGLE_AUTO, active: autoMode },
    { label: "LOG", action: ACTION.TOGGLE_BACKLOG },
    { label: "SAVE", action: ACTION.SHOW_SAVELOAD, payload: "save" },
    { label: "LOAD", action: ACTION.SHOW_SAVELOAD, payload: "load" },
    { label: "CONFIG", action: ACTION.TOGGLE_CONFIG },
  ];

  return (
    <div
      style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}
      onClick={(e) => e.stopPropagation()}
    >
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={() =>
            dispatch({ type: btn.action, ...(btn.payload !== undefined ? { payload: btn.payload } : {}) })
          }
          style={btnStyle(btn.active)}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255,255,255,0.15)";
            e.target.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = btn.active
              ? "rgba(90,180,255,0.25)"
              : "rgba(255,255,255,0.08)";
            e.target.style.color = btn.active ? "#5BF" : "rgba(255,255,255,0.55)";
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
