import { useState, useRef } from "react";

const SYMBOLS = ["🍒", "🔔", "⭐", "💎", "7️⃣", "🍀"];

export default function SlotGame({ config, onComplete }) {
  const { reels = 3, spins = 5, matchRequired = 2 } = config;
  const [slots, setSlots] = useState(Array(reels).fill("❓"));
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState([]);
  const [spinCount, setSpinCount] = useState(0);
  const timerRefs = useRef([]);

  const finished = spinCount >= spins;
  const matches = results.filter(Boolean).length;

  const spin = () => {
    if (spinning || finished) return;
    setSpinning(true);

    // 各リールを時間差で停止
    const finalSlots = Array(reels).fill(null).map(() =>
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    );

    // スピンアニメーション
    let interval = setInterval(() => {
      setSlots(Array(reels).fill(null).map(() =>
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      ));
    }, 80);

    // 停止
    setTimeout(() => {
      clearInterval(interval);
      setSlots(finalSlots);
      setSpinning(false);

      // 判定: 全リール同じ = マッチ
      const isMatch = finalSlots.every((s) => s === finalSlots[0]);
      setResults((prev) => [...prev, isMatch]);
      setSpinCount((c) => c + 1);
    }, 1500);
  };

  if (finished) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>結果</div>
        <div style={{ color: "#FFD700", fontSize: 24, marginBottom: 8 }}>
          {matches} / {spins} 揃い
        </div>
        <div style={{
          color: matches >= matchRequired ? "#4CAF50" : "#F44",
          fontSize: 16, marginBottom: 20,
        }}>
          {matches >= matchRequired ? "大当たり！" : "残念…"}
        </div>
        <button onClick={() => onComplete({ score: matches })} style={styles.btn}>完了</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        Spin {spinCount + 1}/{spins} — 揃い: {matches}
      </div>

      {/* スロットリール */}
      <div style={styles.reelRow}>
        {slots.map((symbol, i) => (
          <div key={i} style={{
            ...styles.reel,
            animation: spinning ? "pulse 0.15s infinite" : "none",
          }}>
            <span style={{ fontSize: 48 }}>{symbol}</span>
          </div>
        ))}
      </div>

      <button onClick={spin} disabled={spinning} style={{
        ...styles.spinBtn,
        opacity: spinning ? 0.5 : 1,
      }}>
        {spinning ? "..." : "SPIN!"}
      </button>
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: 32 },
  header: { color: "#888", fontSize: 12, fontFamily: "monospace", marginBottom: 24 },
  reelRow: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 },
  reel: {
    width: 80, height: 80, borderRadius: 8,
    background: "rgba(255,255,255,0.08)", border: "2px solid rgba(200,180,140,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  spinBtn: {
    background: "rgba(255,215,0,0.15)", border: "2px solid rgba(255,215,0,0.4)",
    color: "#FFD700", padding: "12px 48px", borderRadius: 8,
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
