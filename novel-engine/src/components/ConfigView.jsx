import { ACTION } from "../engine/constants";

export default function ConfigView({ textSpeed, volumeMaster, volumeBGM, volumeSE, dispatch }) {
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
        <span style={{ color: "#E8D4B0", fontSize: 18, letterSpacing: 3 }}>設定</span>
        <button
          onClick={() => dispatch({ type: ACTION.TOGGLE_CONFIG })}
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
      <div style={{ marginBottom: 24 }}>
        <label style={{ color: "#C8A870", fontSize: 14, display: "block", marginBottom: 10 }}>
          テキスト速度: {textSpeed}ms
        </label>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={textSpeed}
          onChange={(e) => dispatch({ type: ACTION.SET_TEXT_SPEED, payload: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "#C8A870" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#666", fontSize: 11, marginTop: 4 }}>
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
          <label style={{ color: "#C8A870", fontSize: 13, display: "block", marginBottom: 6 }}>
            {vol.label}: {Math.round(vol.value * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(vol.value * 100)}
            onChange={(e) => dispatch({ type: vol.action, payload: Number(e.target.value) / 100 })}
            style={{ width: "100%", accentColor: "#C8A870" }}
          />
        </div>
      ))}

      <div style={{ color: "#888", fontSize: 12, lineHeight: 2, marginTop: 8 }}>
        <p>操作方法:</p>
        <p>　クリック / Enter / Space … テキスト送り</p>
        <p>　Ctrl 長押し … スキップ</p>
        <p>　Escape … メニューを閉じる</p>
        <p>　AUTO … 自動再生の切替</p>
      </div>
    </div>
  );
}
