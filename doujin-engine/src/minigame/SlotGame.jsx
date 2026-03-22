import { useState, useRef } from "react";

const DEFAULT_SYMBOLS = ["🍒", "🔔", "⭐", "💎", "7️⃣", "🍀"];

export default function SlotGame({ config, onComplete }) {
  const {
    reels = 3,
    symbols = DEFAULT_SYMBOLS,
    initialCoins = 100,
    betAmount = 10,
    payTable = {},
    spins,
    matchRequired,
  } = config;

  // コイン制 or スピン回数制
  const coinMode = initialCoins > 0 && betAmount > 0;

  const [slots, setSlots] = useState(Array(reels).fill("❓"));
  const [spinning, setSpinning] = useState(false);
  const [coins, setCoins] = useState(initialCoins);
  const [spinCount, setSpinCount] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [finished, setFinished] = useState(false);

  const maxSpins = spins || 999;

  const spin = () => {
    if (spinning || finished) return;
    if (coinMode && coins < betAmount) {
      setFinished(true);
      return;
    }

    setSpinning(true);
    if (coinMode) setCoins((c) => c - betAmount);
    setLastWin(0);

    // 各リールの結果を決定
    const finalSlots = Array(reels).fill(null).map(() =>
      symbols[Math.floor(Math.random() * symbols.length)]
    );

    // アニメーション
    const interval = setInterval(() => {
      setSlots(Array(reels).fill(null).map(() =>
        symbols[Math.floor(Math.random() * symbols.length)]
      ));
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      setSlots(finalSlots);
      setSpinning(false);

      // 配当判定
      const key = finalSlots.join("");
      let win = 0;

      if (payTable[key]) {
        win = payTable[key] * betAmount;
      } else if (finalSlots.every((s) => s === finalSlots[0])) {
        // payTable になくても全一致なら基本配当
        win = betAmount * 10;
      } else {
        // 2つ揃い
        const counts = {};
        finalSlots.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
        const maxCount = Math.max(...Object.values(counts));
        if (maxCount >= 2) win = betAmount * 2;
      }

      if (win > 0) {
        setCoins((c) => c + win);
        setTotalWin((t) => t + win);
        setLastWin(win);
      }

      const newSpinCount = spinCount + 1;
      setSpinCount(newSpinCount);

      // 終了判定
      if (!coinMode && newSpinCount >= maxSpins) {
        setFinished(true);
      }
    }, 1200);
  };

  const handleFinish = () => {
    onComplete({ score: coinMode ? coins : totalWin, spins: spinCount });
  };

  if (finished || (coinMode && coins < betAmount && !spinning)) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>結果</div>
        <div style={{ color: "#FFD700", fontSize: 32, marginBottom: 8 }}>
          {coinMode ? `${coins} コイン` : `${totalWin} WIN`}
        </div>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 20 }}>
          {spinCount} 回プレイ
        </div>
        <button onClick={handleFinish} style={styles.btn}>完了</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {coinMode ? (
          <>
            <span>💰 {coins} コイン</span>
            <span>BET: {betAmount}</span>
            <span>WIN: {totalWin}</span>
          </>
        ) : (
          <>
            <span>Spin {spinCount + 1}/{maxSpins}</span>
            <span>WIN: {totalWin}</span>
          </>
        )}
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

      {/* 前回の結果 */}
      {lastWin > 0 && !spinning && (
        <div style={styles.winDisplay}>
          🎉 {lastWin} WIN!
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={spin} disabled={spinning} style={{
          ...styles.spinBtn,
          opacity: spinning ? 0.5 : 1,
        }}>
          {spinning ? "..." : "SPIN!"}
        </button>
        <button onClick={() => setFinished(true)} style={styles.stopBtn}>
          やめる
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: 32 },
  header: {
    display: "flex", justifyContent: "center", gap: 24,
    color: "#C8A870", fontSize: 14, fontFamily: "monospace", marginBottom: 24,
  },
  reelRow: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 },
  reel: {
    width: 80, height: 80, borderRadius: 8,
    background: "rgba(255,255,255,0.08)", border: "2px solid rgba(200,180,140,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  winDisplay: {
    color: "#FFD700", fontSize: 20, marginBottom: 16, fontWeight: 700,
    animation: "pulse 0.5s",
  },
  spinBtn: {
    background: "rgba(255,215,0,0.15)", border: "2px solid rgba(255,215,0,0.4)",
    color: "#FFD700", padding: "12px 48px", borderRadius: 8,
    fontSize: 18, cursor: "pointer", fontFamily: "inherit", letterSpacing: 3,
  },
  stopBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa", padding: "12px 24px", borderRadius: 8,
    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  result: { textAlign: "center" },
  resultTitle: { color: "#E8D4B0", fontSize: 20, letterSpacing: 3, marginBottom: 16 },
  btn: {
    background: "rgba(200,180,140,0.15)", border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0", padding: "10px 32px", borderRadius: 4,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
};
