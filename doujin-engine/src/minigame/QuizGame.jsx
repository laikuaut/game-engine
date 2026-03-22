import { useState, useEffect, useRef } from "react";

export default function QuizGame({ config, onComplete }) {
  const { questions = [], timeLimit, timePerQuestion } = config;
  const effectiveTimeLimit = timeLimit || (timePerQuestion ? timePerQuestion * questions.length : null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(null); // null | "correct" | "wrong"
  const [timeLeft, setTimeLeft] = useState(effectiveTimeLimit || null);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  // タイマー
  useEffect(() => {
    if (!effectiveTimeLimit || finished) return;
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
  }, [timeLimit, finished]);

  const q = questions[qIndex];

  const handleAnswer = (choiceIdx) => {
    if (answered || finished) return;
    const correct = choiceIdx === q.answer;
    const points = q.points || 10;
    if (correct) setScore((s) => s + points);
    setAnswered(correct ? "correct" : "wrong");

    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        setFinished(true);
        clearInterval(timerRef.current);
      } else {
        setQIndex((i) => i + 1);
        setAnswered(null);
      }
    }, 800);
  };

  if (finished || !q) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>結果発表</div>
        <div style={styles.resultScore}>{score} 点</div>
        <button onClick={() => onComplete({ score, total: questions.length })} style={styles.btn}>
          完了
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Q{qIndex + 1} / {questions.length}</span>
        {effectiveTimeLimit && <span>残り {timeLeft}秒</span>}
        <span>Score: {score}</span>
      </div>
      <div style={styles.question}>{q.question || q.text}</div>
      <div style={styles.choices}>
        {q.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            style={{
              ...styles.choiceBtn,
              background: answered && i === q.answer ? "rgba(76,175,80,0.3)"
                : answered === "wrong" && i !== q.answer ? "rgba(255,255,255,0.03)"
                : "rgba(255,255,255,0.05)",
              borderColor: answered && i === q.answer ? "#4CAF50" : "rgba(200,180,140,0.2)",
            }}
            disabled={!!answered}
          >
            {choice}
          </button>
        ))}
      </div>
      {answered && (
        <div style={{ color: answered === "correct" ? "#4CAF50" : "#F44", fontSize: 16, marginTop: 12 }}>
          {answered === "correct" ? "正解！" : "不正解…"}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: 32, maxWidth: 500 },
  header: { display: "flex", justifyContent: "space-between", color: "#888", fontSize: 12, marginBottom: 24, fontFamily: "monospace" },
  question: { color: "#E8D4B0", fontSize: 18, marginBottom: 24, lineHeight: 1.6 },
  choices: { display: "flex", flexDirection: "column", gap: 10 },
  choiceBtn: {
    background: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "12px 20px", borderRadius: 4,
    fontSize: 15, cursor: "pointer", fontFamily: "inherit",
    textAlign: "left", transition: "all 0.2s",
  },
  result: { textAlign: "center" },
  resultTitle: { color: "#E8D4B0", fontSize: 20, letterSpacing: 3, marginBottom: 16 },
  resultScore: { color: "#FFD700", fontSize: 36, marginBottom: 24 },
  btn: {
    background: "rgba(200,180,140,0.15)", border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0", padding: "10px 32px", borderRadius: 4,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit", letterSpacing: 2,
  },
};
