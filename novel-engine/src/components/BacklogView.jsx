import { ACTION } from "../engine/constants";
import { COLORS, CLOSE_BTN_STYLE, OVERLAY_HEADER_STYLE, OVERLAY_TITLE_STYLE } from "../data/config";

export default function BacklogView({ backlog, dispatch }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: COLORS.bgOverlay,
        overflowY: "auto",
        padding: "24px 32px",
      }}
    >
      <div style={OVERLAY_HEADER_STYLE}>
        <span style={OVERLAY_TITLE_STYLE}>バックログ</span>
        <button
          onClick={() => dispatch({ type: ACTION.TOGGLE_BACKLOG })}
          style={CLOSE_BTN_STYLE}
        >
          閉じる
        </button>
      </div>
      {backlog.length === 0 ? (
        <p style={{ color: COLORS.textDisabled, fontSize: 14, textAlign: "center", marginTop: 40 }}>
          ログはまだありません
        </p>
      ) : (
        [...backlog].reverse().map((entry, i) => (
          <div key={i} style={{
            padding: "10px 0",
            borderBottom: `1px solid ${COLORS.bgWhiteBorderDim}`,
          }}>
            {entry.speaker && (
              <span style={{ color: COLORS.goldAccent, fontSize: 13, marginRight: 12 }}>
                【{entry.speaker}】
              </span>
            )}
            <span style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {entry.text}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
