import { useEffect, useRef, useState, useCallback } from "react";

const W = 480, H = 360;
const PADDLE_W = 80, PADDLE_H = 12, PADDLE_Y = H - 30;
const BALL_R = 6;
const BRICK_ROWS = 5, BRICK_COLS = 8, BRICK_W = 52, BRICK_H = 16, BRICK_GAP = 4, BRICK_TOP = 40;
const COLORS = ["#F44336", "#FF9800", "#FFEB3B", "#4CAF50", "#2196F3"];

export default function BreakoutGame({ config, onComplete }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState(null); // null | "clear" | "over"

  // 初期化
  useEffect(() => {
    const bricks = [];
    const cols = config?.cols || BRICK_COLS;
    const rows = config?.rows || BRICK_ROWS;
    const bw = (W - BRICK_GAP * (cols + 1)) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: BRICK_GAP + c * (bw + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          w: bw,
          h: BRICK_H,
          color: COLORS[r % COLORS.length],
          alive: true,
        });
      }
    }

    stateRef.current = {
      paddle: { x: W / 2 - PADDLE_W / 2, w: PADDLE_W },
      ball: { x: W / 2, y: PADDLE_Y - BALL_R - 2, vx: 3, vy: -3, launched: false },
      bricks,
      score: 0,
      lives: config?.lives || 3,
      mouseX: W / 2,
    };
    setStatus(null);

    // ゲームループ
    const loop = () => {
      const gs = stateRef.current;
      if (!gs || status) { rafRef.current = requestAnimationFrame(loop); return; }
      update(gs);
      draw(canvasRef.current, gs);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config]);

  // マウス追従
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect;
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const scaleX = W / r.width;
      stateRef.current.mouseX = (e.clientX - r.left) * scaleX;
    };
    const onClick = () => {
      if (stateRef.current && !stateRef.current.ball.launched) {
        stateRef.current.ball.launched = true;
      }
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  const update = useCallback((gs) => {
    const { paddle, ball, bricks } = gs;

    // パドル追従
    paddle.x = Math.max(0, Math.min(W - paddle.w, gs.mouseX - paddle.w / 2));

    if (!ball.launched) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = PADDLE_Y - BALL_R - 2;
      return;
    }

    // ボール移動
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 壁反射
    if (ball.x - BALL_R <= 0 || ball.x + BALL_R >= W) ball.vx *= -1;
    if (ball.y - BALL_R <= 0) ball.vy *= -1;

    // 落下
    if (ball.y + BALL_R >= H) {
      gs.lives--;
      if (gs.lives <= 0) {
        setStatus("over");
        return;
      }
      ball.launched = false;
      ball.vx = 3 * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = -3;
    }

    // パドル反射
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PADDLE_Y &&
      ball.y + BALL_R <= PADDLE_Y + PADDLE_H &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w
    ) {
      ball.vy = -Math.abs(ball.vy);
      // 当たった位置で角度調整
      const hit = (ball.x - paddle.x) / paddle.w - 0.5; // -0.5〜0.5
      ball.vx = hit * 8;
      // 速度制限
      const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      if (speed > 6) {
        ball.vx *= 6 / speed;
        ball.vy *= 6 / speed;
      }
    }

    // ブロック衝突
    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (
        ball.x + BALL_R > brick.x &&
        ball.x - BALL_R < brick.x + brick.w &&
        ball.y + BALL_R > brick.y &&
        ball.y - BALL_R < brick.y + brick.h
      ) {
        brick.alive = false;
        ball.vy *= -1;
        gs.score += 10;
        break;
      }
    }

    // クリア判定
    if (bricks.every((b) => !b.alive)) {
      setStatus("clear");
    }
  }, []);

  const draw = (canvas, gs) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // 背景
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);

    // ブロック
    gs.bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    // パドル
    ctx.fillStyle = "#E8D4B0";
    ctx.fillRect(gs.paddle.x, PADDLE_Y, gs.paddle.w, PADDLE_H);

    // ボール
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // HUD
    ctx.fillStyle = "#888";
    ctx.font = "12px monospace";
    ctx.fillText(`SCORE: ${gs.score}  LIVES: ${"♥".repeat(gs.lives)}`, 8, 16);

    if (!gs.ball.launched) {
      ctx.fillStyle = "rgba(255,215,0,0.6)";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Click to launch!", W / 2, H / 2);
      ctx.textAlign = "left";
    }
  };

  if (status) {
    return (
      <div style={styles.result}>
        <div style={styles.resultTitle}>{status === "clear" ? "STAGE CLEAR!" : "GAME OVER"}</div>
        <div style={{ color: "#FFD700", fontSize: 32, marginBottom: 24 }}>
          {stateRef.current?.score || 0} pts
        </div>
        <button onClick={() => onComplete({ score: stateRef.current?.score || 0 })} style={styles.btn}>完了</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ border: "1px solid #333", cursor: "none", maxWidth: "100%" }}
      />
    </div>
  );
}

const styles = {
  container: { display: "flex", alignItems: "center", justifyContent: "center" },
  result: { textAlign: "center" },
  resultTitle: { color: "#E8D4B0", fontSize: 24, letterSpacing: 3, marginBottom: 16 },
  btn: {
    background: "rgba(200,180,140,0.15)", border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0", padding: "10px 32px", borderRadius: 4,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
};
