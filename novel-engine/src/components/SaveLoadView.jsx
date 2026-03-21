import { useState } from "react";
import { ACTION } from "../engine/constants";
import { COLORS, CLOSE_BTN_STYLE, OVERLAY_HEADER_STYLE, OVERLAY_TITLE_STYLE } from "../data/config";

export default function SaveLoadView({ saves, mode, dispatch, onSave, onLoad }) {
  const [hoveredSlot, setHoveredSlot] = useState(-1);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: COLORS.bgOverlay,
        padding: "24px 32px",
      }}
    >
      <div style={OVERLAY_HEADER_STYLE}>
        <span style={OVERLAY_TITLE_STYLE}>
          {mode === "save" ? "セーブ" : "ロード"}
        </span>
        <button
          onClick={() => dispatch({ type: ACTION.HIDE_SAVELOAD })}
          style={CLOSE_BTN_STYLE}
        >
          閉じる
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {saves.map((save, i) => {
          const isInteractive = save || mode === "save";
          const isHovered = hoveredSlot === i && isInteractive;
          return (
            <button
              key={i}
              onClick={() => {
                if (mode === "save") {
                  if (onSave) onSave(i);
                  else dispatch({ type: ACTION.SAVE_GAME, payload: { slot: i } });
                } else if (save) {
                  if (onLoad) onLoad(i);
                  else dispatch({ type: ACTION.LOAD_GAME, payload: { slot: i } });
                }
              }}
              style={{
                background: isHovered
                  ? COLORS.goldBg
                  : save ? COLORS.goldBgSubtle : COLORS.bgSurface,
                border: `1px solid ${save ? COLORS.goldBorder : COLORS.bgWhiteBorderDim}`,
                padding: "16px 20px",
                borderRadius: 4,
                cursor: isInteractive ? "pointer" : "default",
                textAlign: "left",
                transition: "all 0.2s",
                opacity: !save && mode === "load" ? 0.4 : 1,
                fontFamily: "inherit",
              }}
              onMouseEnter={() => setHoveredSlot(i)}
              onMouseLeave={() => setHoveredSlot(-1)}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {save?.thumbnail && (
                  <img src={save.thumbnail} alt="" style={{
                    width: 80, height: 45, objectFit: "cover", borderRadius: 3,
                    border: `1px solid ${COLORS.goldBorderLight}`,
                  }} />
                )}
                <div>
                  <div style={{ color: COLORS.goldAccent, fontSize: 14, marginBottom: 4 }}>
                    スロット {i + 1}
                  </div>
                  {save ? (
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                      {save.date} — {save.speaker && `【${save.speaker}】`}
                      {save.text?.substring(0, 30)}…
                    </div>
                  ) : (
                    <div style={{ color: COLORS.textDisabled, fontSize: 12 }}>
                      {mode === "save" ? "新しいセーブを作成" : "— Empty —"}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
