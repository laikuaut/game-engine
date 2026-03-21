import { useState } from "react";
import { ACTION } from "../engine/constants";

const btnStyle = (active, hovered) => ({
  background: hovered
    ? "rgba(200,180,140,0.2)"
    : active
      ? "rgba(200,180,140,0.15)"
      : "rgba(255,255,255,0.08)",
  border: `1px solid ${active ? "rgba(200,180,140,0.5)" : hovered ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.15)"}`,
  color: hovered ? "#E8D4B0" : active ? "#C8A870" : "rgba(255,255,255,0.55)",
  padding: "4px 14px",
  borderRadius: 3,
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.2s",
  letterSpacing: 1.5,
  fontFamily: "'Noto Serif JP', serif",
});

export default function Controls({ autoMode, skipMode, dispatch }) {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const isSkipping = skipMode;
  const buttons = [
    { label: isSkipping ? "SKIP ●" : "SKIP", action: ACTION.SET_SKIP_MODE, payload: !skipMode, active: isSkipping },
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
          style={btnStyle(btn.active, hoveredBtn === btn.label)}
          onMouseEnter={() => setHoveredBtn(btn.label)}
          onMouseLeave={() => setHoveredBtn(null)}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
