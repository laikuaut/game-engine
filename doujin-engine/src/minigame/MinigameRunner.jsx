import QuizGame from "./QuizGame";
import TimingGame from "./TimingGame";
import MemoryGame from "./MemoryGame";
import JankenGame from "./JankenGame";
import SlotGame from "./SlotGame";
import BreakoutGame from "./BreakoutGame";

const GAMES = {
  quiz: QuizGame,
  timing: TimingGame,
  memory: MemoryGame,
  janken: JankenGame,
  slot: SlotGame,
  breakout: BreakoutGame,
};

export default function MinigameRunner({ type, config, onResult, onBack }) {
  const GameComponent = GAMES[type];
  if (!GameComponent) {
    return (
      <div style={styles.container}>
        <p style={{ color: "#888" }}>未対応のミニゲーム: {type}</p>
        <button onClick={() => onResult({ score: 0, passed: false })} style={styles.btn}>戻る</button>
      </div>
    );
  }
  return (
    <div style={styles.container}>
      {onBack && <div onClick={onBack} style={styles.backBtn}>← BACK</div>}
      <GameComponent
        config={config}
        onComplete={(result) => {
          const passed = result.score >= (config.passingScore || config.passScore || 1);
          onResult({ ...result, passed });
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    width: "100%", height: "100%", position: "relative",
    background: "rgba(10,10,20,0.97)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Noto Serif JP', serif",
  },
  backBtn: {
    position: "absolute", top: 12, left: 16, zIndex: 20,
    fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace",
    background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 12,
    cursor: "pointer",
  },
  btn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#E8D4B0", padding: "10px 24px", borderRadius: 4,
    cursor: "pointer", fontSize: 14, fontFamily: "inherit",
  },
};
