import { useState } from "react";

const HANDS = [
  { id: "rock", emoji: "✊", name: "グー" },
  { id: "scissors", emoji: "✌️", name: "チョキ" },
  { id: "paper", emoji: "🖐️", name: "パー" },
];

const WINS = { rock: "scissors", scissors: "paper", paper: "rock" };

export default function JankenGame({ config, onComplete }) {
  const { rounds = 3, winRequired = 2, npcName = "相手" } = config;
  const [playerHand, setPlayerHand] = useState(null);
  const [npcHand, setNpcHand] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const play = (handId) => {
    if (showResult || finished) return;

    const npc = HANDS[Math.floor(Math.random() * 3)];
    setPlayerHand(handId);
    setNpcHand(npc.id);
    setShowResult(true);

    let result;
    if (handId === npc.id) {
      result = "draw";
      setDraws((d) => d + 1);
    } else if (WINS[handId] === npc.id) {
      result = "win";
      setWins((w) => w + 1);
    } else {
      result = "lose";
      setLosses((l) => l + 1);
    }
    setRoundResult(result);

    setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      setShowResult(false);
      setPlayerHand(null);
      setNpcHand(null);
      setRoundResult(null);

      if (nextRound >= rounds) {
        setFinished(true);
      }
    }, 1200);
  };

  if (finished) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>結果</div>
        <div style={{ color: "#FFD700", fontSize: 24, marginBottom: 8 }}>
          {wins}勝 {losses}敗 {draws}引分
        </div>
        <div style={{ color: wins >= winRequired ? "#4CAF50" : "#F44", fontSize: 16, marginBottom: 20 }}>
          {wins >= winRequired ? "勝利！" : "敗北…"}
        </div>
        <button onClick={() => onComplete({ score: wins })} style={styles.btn}>完了</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        Round {round + 1}/{rounds} — {wins}勝 {losses}敗 — vs {npcName}
      </div>

      {/* NPC の手 */}
      <div style={styles.npcArea}>
        <div style={styles.npcName}>{npcName}</div>
        <div style={styles.handDisplay}>
          {showResult ? HANDS.find((h) => h.id === npcHand)?.emoji : "❓"}
        </div>
      </div>

      {/* 結果表示 */}
      {showResult && (
        <div style={{
          fontSize: 24, marginBottom: 12,
          color: roundResult === "win" ? "#4CAF50" : roundResult === "lose" ? "#F44" : "#FA0",
        }}>
          {roundResult === "win" ? "WIN!" : roundResult === "lose" ? "LOSE..." : "DRAW"}
        </div>
      )}

      {/* プレイヤーの手選択 */}
      <div style={styles.handsRow}>
        {HANDS.map((hand) => (
          <button
            key={hand.id}
            onClick={() => play(hand.id)}
            style={{
              ...styles.handBtn,
              borderColor: playerHand === hand.id ? "#FFD700" : "rgba(200,180,140,0.2)",
              transform: playerHand === hand.id ? "scale(1.2)" : "scale(1)",
            }}
            disabled={showResult}
          >
            <span style={{ fontSize: 36 }}>{hand.emoji}</span>
            <span style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{hand.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: 32 },
  header: { color: "#888", fontSize: 12, fontFamily: "monospace", marginBottom: 24 },
  npcArea: { marginBottom: 20 },
  npcName: { color: "#C8A870", fontSize: 14, marginBottom: 8 },
  handDisplay: { fontSize: 48, height: 60 },
  handsRow: { display: "flex", gap: 16, justifyContent: "center" },
  handBtn: {
    background: "rgba(255,255,255,0.05)", border: "2px solid rgba(200,180,140,0.2)",
    borderRadius: 12, padding: "16px 20px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center",
    transition: "all 0.2s",
  },
  result: { textAlign: "center" },
  resultTitle: { color: "#E8D4B0", fontSize: 20, letterSpacing: 3, marginBottom: 16 },
  btn: {
    background: "rgba(200,180,140,0.15)", border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0", padding: "10px 32px", borderRadius: 4,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
};
