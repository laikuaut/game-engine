export default function TextBox({ speaker, text, isTyping, showChoice }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background:
          "linear-gradient(180deg, rgba(10,10,20,0.0) 0%, rgba(10,10,20,0.85) 20%, rgba(10,10,20,0.95) 100%)",
        padding: "40px 32px 20px",
        minHeight: "30%",
      }}
    >
      {/* 話者名 */}
      {speaker && (
        <div
          style={{
            display: "inline-block",
            marginBottom: 8,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "3px 16px",
            borderRadius: 3,
            fontSize: 14,
            color: "#E8D4B0",
            letterSpacing: 2,
            fontWeight: 600,
          }}
        >
          {speaker}
        </div>
      )}

      {/* テキスト本文 */}
      <div
        style={{
          fontSize: 17,
          lineHeight: 1.9,
          color: "#E8E4DC",
          minHeight: 72,
          whiteSpace: "pre-wrap",
          letterSpacing: 0.8,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {text}
        {isTyping && (
          <span style={{ animation: "blink 0.5s infinite", color: "#FFD700" }}>▏</span>
        )}
      </div>

      {/* クリック送りインジケーター */}
      {!isTyping && !showChoice && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 28,
            fontSize: 12,
            color: "rgba(255,215,0,0.7)",
            animation: "bounce 1.2s infinite",
          }}
        >
          ▼
        </div>
      )}
    </div>
  );
}
