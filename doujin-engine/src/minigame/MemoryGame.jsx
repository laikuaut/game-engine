import { useState, useEffect, useRef } from "react";

const EMOJI_SET = ["🌸","🌙","⭐","🔥","💎","🎵","🍀","❤️","🦋","🐱","🌈","🍎"];

export default function MemoryGame({ config, onComplete }) {
  const { pairs = 6, timeLimit = 60 } = config;
  const [cards, setCards] = useState(() => {
    const emojis = EMOJI_SET.slice(0, pairs);
    const deck = [...emojis, ...emojis].map((emoji, i) => ({
      id: i, emoji, flipped: false, matched: false,
    }));
    // シャッフル
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  });
  const [selected, setSelected] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finished]);

  // 全ペア完成チェック
  useEffect(() => {
    if (matchCount >= pairs && !finished) {
      clearInterval(timerRef.current);
      setFinished(true);
    }
  }, [matchCount, pairs, finished]);

  const handleClick = (idx) => {
    if (finished || cards[idx].flipped || cards[idx].matched || selected.length >= 2) return;
    const newCards = [...cards];
    newCards[idx] = { ...newCards[idx], flipped: true };
    setCards(newCards);
    const newSelected = [...selected, idx];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          ));
          setMatchCount((m) => m + 1);
          setSelected([]);
        }, 300);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
        }, 800);
      }
    }
  };

  if (finished) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>結果</div>
        <div style={{ color: "#FFD700", fontSize: 24, marginBottom: 12 }}>
          {matchCount} / {pairs} ペア{matchCount >= pairs ? " 完全クリア！" : ""}
        </div>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 20 }}>残り時間: {timeLeft}秒</div>
        <button onClick={() => onComplete({ score: matchCount })} style={styles.btn}>完了</button>
      </div>
    );
  }

  const cols = pairs <= 4 ? 4 : pairs <= 6 ? 4 : 6;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>ペア: {matchCount}/{pairs}</span>
        <span>残り {timeLeft}秒</span>
      </div>
      <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${cols}, 60px)` }}>
        {cards.map((card, i) => (
          <div
            key={card.id}
            onClick={() => handleClick(i)}
            style={{
              ...styles.card,
              background: card.matched ? "rgba(76,175,80,0.15)"
                : card.flipped ? "rgba(200,180,140,0.15)"
                : "rgba(255,255,255,0.08)",
              cursor: card.flipped || card.matched ? "default" : "pointer",
              borderColor: card.matched ? "rgba(76,175,80,0.4)" : "rgba(200,180,140,0.2)",
            }}
          >
            {card.flipped || card.matched ? (
              <span style={{ fontSize: 24 }}>{card.emoji}</span>
            ) : (
              <span style={{ fontSize: 18, color: "#444" }}>？</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: 24 },
  header: { display: "flex", justifyContent: "space-between", color: "#888", fontSize: 12, fontFamily: "monospace", marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" },
  grid: { display: "grid", gap: 8, justifyContent: "center" },
  card: {
    width: 60, height: 60, borderRadius: 6,
    border: "1px solid rgba(200,180,140,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s", userSelect: "none",
  },
  result: { textAlign: "center" },
  resultTitle: { color: "#E8D4B0", fontSize: 20, letterSpacing: 3, marginBottom: 16 },
  btn: {
    background: "rgba(200,180,140,0.15)", border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0", padding: "10px 32px", borderRadius: 4,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
};
