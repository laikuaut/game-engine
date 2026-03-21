// NVL モード（全画面テキスト表示）
export default function NVLTextBox({ nvlLog, currentSpeaker, currentText, isTyping }) {
  return (
    <div style={styles.container}>
      <div style={styles.textArea}>
        {nvlLog.map((entry, i) => (
          <div key={i} style={styles.line}>
            {entry.speaker && (
              <span style={styles.speaker}>【{entry.speaker}】</span>
            )}
            <span style={styles.text}>{entry.text}</span>
          </div>
        ))}
        {/* 現在表示中のテキスト */}
        {currentText && (
          <div style={styles.line}>
            {currentSpeaker && (
              <span style={styles.speaker}>【{currentSpeaker}】</span>
            )}
            <span style={styles.text}>
              {currentText}
              {isTyping && <span style={{ animation: "blink 0.5s infinite", color: "#FFD700" }}>▏</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    background: "rgba(10,10,20,0.85)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "40px 60px",
    overflowY: "auto",
  },
  textArea: {
    maxHeight: "100%",
  },
  line: {
    marginBottom: 12,
    lineHeight: 2,
  },
  speaker: {
    color: "#C8A870",
    fontSize: 15,
    marginRight: 8,
  },
  text: {
    color: "#E8E4DC",
    fontSize: 16,
    lineHeight: 2,
    whiteSpace: "pre-wrap",
    letterSpacing: 0.8,
  },
};
