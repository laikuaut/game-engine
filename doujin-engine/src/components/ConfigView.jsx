import { ACTION } from "../engine/constants";
import { COLORS, CLOSE_BTN_STYLE, OVERLAY_HEADER_STYLE, OVERLAY_TITLE_STYLE, SCREEN_PRESETS } from "../data/config";

export default function ConfigView({ textSpeed, volumeMaster, volumeBGM, volumeSE, screenSize, dispatch }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        zIndex: 40,
        background: COLORS.bgOverlay,
        padding: "24px 32px",
      }}
    >
      <div style={OVERLAY_HEADER_STYLE}>
        <span style={OVERLAY_TITLE_STYLE}>設定</span>
        <button
          onClick={() => dispatch({ type: ACTION.TOGGLE_CONFIG })}
          style={CLOSE_BTN_STYLE}
        >
          閉じる
        </button>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ color: COLORS.goldAccent, fontSize: 14, display: "block", marginBottom: 10 }}>
          テキスト速度: {textSpeed}ms
        </label>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={textSpeed}
          onChange={(e) => dispatch({ type: ACTION.SET_TEXT_SPEED, payload: Number(e.target.value) })}
          style={{ width: "100%", accentColor: COLORS.goldAccent }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.textFaint, fontSize: 11, marginTop: 4 }}>
          <span>速い ←</span>
          <span>→ 遅い</span>
        </div>
      </div>
      {/* 音量スライダー */}
      {[
        { label: "マスター音量", value: volumeMaster ?? 1.0, action: ACTION.SET_VOLUME_MASTER },
        { label: "BGM 音量", value: volumeBGM ?? 0.8, action: ACTION.SET_VOLUME_BGM },
        { label: "SE 音量", value: volumeSE ?? 1.0, action: ACTION.SET_VOLUME_SE },
      ].map((vol) => (
        <div key={vol.action} style={{ marginBottom: 16 }}>
          <label style={{ color: COLORS.goldAccent, fontSize: 13, display: "block", marginBottom: 6 }}>
            {vol.label}: {Math.round(vol.value * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(vol.value * 100)}
            onChange={(e) => dispatch({ type: vol.action, payload: Number(e.target.value) / 100 })}
            style={{ width: "100%", accentColor: COLORS.goldAccent }}
          />
        </div>
      ))}

      {/* 画面サイズ */}
      {screenSize !== undefined && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: COLORS.goldAccent, fontSize: 13, display: "block", marginBottom: 8 }}>
            画面サイズ
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SCREEN_PRESETS.map((preset) => {
              const isActive = screenSize === preset.label;
              return (
                <button
                  key={preset.label}
                  onClick={() => dispatch({ type: "SET_SCREEN_SIZE", payload: preset.label })}
                  style={{
                    padding: "5px 14px",
                    fontSize: 12,
                    borderRadius: 3,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: `1px solid ${isActive ? COLORS.goldAccent : "rgba(255,255,255,0.15)"}`,
                    background: isActive ? "rgba(200,180,140,0.2)" : "rgba(255,255,255,0.04)",
                    color: isActive ? COLORS.gold : COLORS.textDim,
                    transition: "all 0.2s",
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 2, marginTop: 8 }}>
        <p style={{ color: COLORS.goldAccent, marginBottom: 4 }}>操作方法:</p>
        <p>　クリック / Enter / Space … テキスト送り</p>
        <p>　数字キー (1-9) … 選択肢を直接選択</p>
        <p>　矢印キー … 選択肢の移動</p>
        <p>　Ctrl 長押し … スキップ</p>
        <p>　Escape … メニューを閉じる</p>
      </div>
    </div>
  );
}
