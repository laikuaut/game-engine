import { useState, useEffect, useRef } from "react";

export default function TimingGame({ config, onComplete }) {
  const { speed = 3, targetZone = { start: 0.35, end: 0.65 }, attempts = 3, passRequired = 2 } = config;
  const [pos, setPos] = useState(0);
  const [direction, setDirection] = useState(1);
  const [results, setResults] = useState([]);
  const [stopped, setStopped] = useState(false);
  const rafRef = useRef(null);
  const posRef = useRef(0);

  const currentAttempt = results.length;
  const finished = currentAttempt >= attempts;
  const successes = results.filter(Boolean).length;

  useEffect(() => {
    if (finished || stopped) return;
    const frame = () => {
      posRef.current += speed * 0.01 * (direction);
      if (posRef.current >= 1) { posRef.current = 1; setDirection(-1); }
      if (posRef.current <= 0) { posRef.current = 0; setDirection(1); }
      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [finished, stopped, speed, direction]);

  const handleStop = () => {
    if (finished || stopped) return;
    setStopped(true);
    cancelAnimationFrame(rafRef.current);
    const hit = posRef.current >= targetZone.start && posRef.current <= targetZone.end;
    setTimeout(() => {
      setResults((prev) => [...prev, hit]);
      setStopped(false);
      posRef.current = 0;
      setPos(0);
      setDirection(1);
    }, 600);
  };

  if (finished) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>結果</div>
        <div style={{ color: "#FFD700", fontSize: 24, marginBottom: 12 }}>
          {successes} / {attempts} 成功
        </div>
        <button onClick={() => onComplete({ score: successes })} style={styles.btn}>完了</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        Try {currentAttempt + 1} / {attempts} — 成功: {successes}
      </div>
      {/* ゲージ */}
      <div style={styles.gauge}>
        <div style={{
          ...styles.targetZone,
          left: `${targetZone.start * 100}%`,
          width: `${(targetZone.end - targetZone.start) * 100}%`,
        }} />
        <div style={{ ...styles.cursor, left: `${pos * 100}%` }} />
      </div>
      <button onClick={handleStop} style={styles.stopBtn}>
        STOP!
      </button>
      {stopped && (
        <div style={{
          color: pos >= targetZone.start && pos <= targetZone.end ? "#4CAF50" : "#F44",
          fontSize: 20, marginTop: 12,
        }}>
          {pos >= targetZone.start && pos <= targetZone.end ? "SUCCESS!" : "MISS..."}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: 32 },
  header: { color: "#888", fontSize: 12, fontFamily: "monospace", marginBottom: 24 },
  gauge: {
    position: "relative", width: 400, height: 40,
    background: "rgba(255,255,255,0.1)", borderRadius: 6,
    margin: "0 auto 20px", overflow: "hidden",
  },
  targetZone: {
    position: "absolute", top: 0, bottom: 0,
    background: "rgba(76,175,80,0.3)", borderLeft: "2px solid #4CAF50", borderRight: "2px solid #4CAF50",
  },
  cursor: {
    position: "absolute", top: -4, bottom: -4, width: 4,
    background: "#FFD700", borderRadius: 2, transform: "translateX(-50%)",
    transition: "none",
  },
  stopBtn: {
    background: "rgba(255,80,80,0.2)", border: "2px solid rgba(255,80,80,0.5)",
    color: "#F55", padding: "12px 40px", borderRadius: 8,
    fontSize: 18, cursor: "pointer", fontFamily: "inherit", letterSpacing: 3,
  },
  result: { textAlign: "center" },
  resultTitle: { color: "#E8D4B0", fontSize: 20, letterSpacing: 3, marginBottom: 16 },
  btn: {
    background: "rgba(200,180,140,0.15)", border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0", padding: "10px 32px", borderRadius: 4,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
};
