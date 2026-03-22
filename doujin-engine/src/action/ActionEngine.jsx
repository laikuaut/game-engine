import { useEffect, useRef, useCallback, useState } from "react";
import { useActionInput } from "./useActionInput";
import { createPhysicsWorld, updatePhysics } from "./physics";
import { updateEnemies } from "./enemies";

const TILE_SIZE = 32;
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 12;

// ゲーム状態
function createInitialState(stage, actionData, map) {
  const player = {
    x: (stage.spawnPoint?.x || 2) * TILE_SIZE,
    y: (stage.spawnPoint?.y || 10) * TILE_SIZE,
    vx: 0,
    vy: 0,
    width: actionData.playerConfig?.hitbox?.width || 24,
    height: actionData.playerConfig?.hitbox?.height || 32,
    hp: actionData.playerConfig?.hp || 100,
    maxHp: actionData.playerConfig?.hp || 100,
    speed: actionData.playerConfig?.speed || 4,
    jumpPower: actionData.playerConfig?.jumpPower || 10,
    grounded: false,
    facing: 1, // 1=right, -1=left
    attacking: false,
    attackTimer: 0,
    invincible: 0,
    state: "idle", // idle, run, jump, attack, damage
  };

  const enemies = (stage.enemyPlacements || []).map((ep, i) => {
    const def = (actionData.enemies || []).find((e) => e.id === ep.enemyId) || {};
    return {
      id: `enemy_${i}`,
      defId: ep.enemyId,
      x: ep.x * TILE_SIZE,
      y: ep.y * TILE_SIZE,
      vx: 0,
      vy: 0,
      width: def.hitbox?.width || 24,
      height: def.hitbox?.height || 24,
      hp: def.hp || 30,
      maxHp: def.hp || 30,
      damage: def.damage || 10,
      speed: def.speed || 1.5,
      behavior: def.behavior || "patrol",
      sprite: def.sprite || null,
      color: def.color || "#e44",
      name: def.name || ep.enemyId,
      alive: true,
      facing: 1,
      patrolDir: 1,
      patrolDist: 0,
      patrolMax: (def.patrolRange || 4) * TILE_SIZE,
    };
  });

  const items = (stage.itemPlacements || []).map((ip, i) => {
    const def = (actionData.items || []).find((it) => it.id === ip.itemId) || {};
    return {
      id: `item_${i}`,
      defId: ip.itemId,
      x: ip.x * TILE_SIZE,
      y: ip.y * TILE_SIZE,
      width: 16,
      height: 16,
      type: def.type || "score",
      value: def.value || 100,
      name: def.name || ip.itemId,
      color: def.type === "heal" ? "#4f4" : "#ff0",
      collected: false,
    };
  });

  return {
    player,
    enemies,
    items,
    score: 0,
    time: 0,
    timeLimit: stage.timeLimit || 0,
    cleared: false,
    gameOver: false,
    paused: false,
  };
}

// タイルマップから衝突マップを構築
function buildCollisionMap(map) {
  if (!map || !map.layers || !map.layers[0]) return [];
  const terrain = map.layers[0].tiles;
  return terrain.map((row) =>
    row.map((tile) => tile !== null && tile !== "")
  );
}

export default function ActionEngine({
  actionData,
  stage,
  map,
  onClear,
  onGameOver,
  onNovelEvent,
  onBack,
  projectId,
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, score: 0, time: 0 });
  const [status, setStatus] = useState(null); // null | "clear" | "gameover"
  const [showDebug, setShowDebug] = useState(false);

  const collisionMap = useRef([]);
  const input = useActionInput();

  // 初期化
  useEffect(() => {
    if (!stage || !actionData) return;
    stateRef.current = createInitialState(stage, actionData, map);
    collisionMap.current = buildCollisionMap(map);
    lastTimeRef.current = performance.now();
    setStatus(null);

    // ゲームループ開始
    const loop = (now) => {
      const dt = Math.min((now - lastTimeRef.current) / 16.67, 3); // deltaTime（60fps基準）
      lastTimeRef.current = now;

      const gs = stateRef.current;
      if (!gs || gs.paused || gs.cleared || gs.gameOver) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // 更新
      updatePlayer(gs, input.current, collisionMap.current, map, dt);
      updateEnemies(gs, collisionMap.current, map, dt);
      updateItems(gs);
      checkStageEvents(gs);
      gs.time += dt / 60;

      // HUD更新（毎フレームではなく10フレームごと）
      if (Math.floor(gs.time * 60) % 10 === 0) {
        setHud({
          hp: gs.player.hp,
          maxHp: gs.player.maxHp,
          score: gs.score,
          time: Math.floor(gs.time),
        });
      }

      // 描画
      draw(canvasRef.current, gs, collisionMap.current, map, showDebug);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stage, actionData, map]);

  // プレイヤー更新
  const updatePlayer = (gs, inp, colMap, mapData, dt) => {
    const p = gs.player;
    const cfg = actionData.playerConfig || {};

    // 入力処理
    if (inp.left) { p.vx = -p.speed * dt; p.facing = -1; p.state = "run"; }
    else if (inp.right) { p.vx = p.speed * dt; p.facing = 1; p.state = "run"; }
    else { p.vx = 0; if (p.grounded) p.state = "idle"; }

    if (inp.jump && p.grounded) {
      p.vy = -p.jumpPower;
      p.grounded = false;
      p.state = "jump";
    }

    if (inp.attack && !p.attacking) {
      p.attacking = true;
      p.attackTimer = 15;
      p.state = "attack";
      // 攻撃判定
      const atkRange = cfg.attacks?.[0]?.range || 32;
      const atkDamage = cfg.attacks?.[0]?.damage || 10;
      const atkX = p.facing > 0 ? p.x + p.width : p.x - atkRange;
      gs.enemies.forEach((e) => {
        if (!e.alive) return;
        if (aabb(atkX, p.y, atkRange, p.height, e.x, e.y, e.width, e.height)) {
          e.hp -= atkDamage;
          if (e.hp <= 0) {
            e.alive = false;
            gs.score += 100;
          }
        }
      });
    }

    if (p.attackTimer > 0) {
      p.attackTimer -= dt;
      if (p.attackTimer <= 0) p.attacking = false;
    }

    // 重力
    p.vy += (cfg.gravity || GRAVITY) * dt;
    if (p.vy > (cfg.maxFallSpeed || MAX_FALL_SPEED)) p.vy = cfg.maxFallSpeed || MAX_FALL_SPEED;

    // 移動 + 衝突
    moveAndCollide(p, colMap, mapData, dt);

    // 無敵時間
    if (p.invincible > 0) p.invincible -= dt;

    // 敵との接触
    if (p.invincible <= 0) {
      gs.enemies.forEach((e) => {
        if (!e.alive) return;
        if (aabb(p.x, p.y, p.width, p.height, e.x, e.y, e.width, e.height)) {
          p.hp -= e.damage;
          p.invincible = (cfg.invincibleTime || 1000) / 16.67;
          p.state = "damage";
          // ノックバック
          p.vx = p.facing * -3;
          p.vy = -4;
        }
      });
    }

    // 落下死
    if (mapData && p.y > mapData.height * TILE_SIZE + 100) {
      p.hp = 0;
    }

    // ゲームオーバー
    if (p.hp <= 0) {
      gs.gameOver = true;
      setStatus("gameover");
      if (onGameOver) setTimeout(onGameOver, 2000);
    }
  };

  // アイテム収集
  const updateItems = (gs) => {
    const p = gs.player;
    gs.items.forEach((item) => {
      if (item.collected) return;
      if (aabb(p.x, p.y, p.width, p.height, item.x, item.y, item.width, item.height)) {
        item.collected = true;
        if (item.type === "score") gs.score += item.value;
        if (item.type === "heal") {
          p.hp = Math.min(p.maxHp, p.hp + item.value);
        }
      }
    });
  };

  // ステージイベントチェック
  const checkStageEvents = (gs) => {
    if (gs.cleared) return;
    const p = gs.player;
    const cond = stage.clearCondition || "reach_goal";

    if (cond === "reach_goal" && stage.goalPoint) {
      const gx = stage.goalPoint.x * TILE_SIZE;
      const gy = stage.goalPoint.y * TILE_SIZE;
      if (aabb(p.x, p.y, p.width, p.height, gx, gy, TILE_SIZE, TILE_SIZE)) {
        gs.cleared = true;
        setStatus("clear");
        if (onClear) setTimeout(onClear, 2000);
      }
    }

    if (cond === "defeat_all") {
      if (gs.enemies.every((e) => !e.alive)) {
        gs.cleared = true;
        setStatus("clear");
        if (onClear) setTimeout(onClear, 2000);
      }
    }

    // ステージ内ノベルイベント
    (stage.events || []).forEach((evt) => {
      if (evt._triggered) return;
      if (evt.trigger === "reach" && evt.x !== undefined) {
        const ex = evt.x * TILE_SIZE;
        const ey = (evt.y || 0) * TILE_SIZE;
        if (aabb(p.x, p.y, p.width, p.height, ex, ey, TILE_SIZE, TILE_SIZE * 2)) {
          evt._triggered = true;
          if (evt.action === "novel" && onNovelEvent) {
            gs.paused = true;
            onNovelEvent(evt.sceneId, () => { gs.paused = false; });
          }
        }
      }
    });
  };

  // ポーズ切替
  const togglePause = useCallback(() => {
    if (stateRef.current) stateRef.current.paused = !stateRef.current.paused;
  }, []);

  // キーバインド（ポーズ・デバッグ）
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "p" || e.key === "P") togglePause();
      if (e.key === "F1") { e.preventDefault(); setShowDebug((d) => !d); }
      if (e.key === "Escape" && onBack) onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePause, onBack]);

  const mapWidth = map ? map.width * TILE_SIZE : 640;
  const mapHeight = map ? map.height * TILE_SIZE : 384;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
        style={{ border: "1px solid #333", imageRendering: "pixelated", maxWidth: "100%", maxHeight: "80vh" }}
      />
      {/* HUD */}
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 16, fontSize: 12, color: "#fff", fontFamily: "monospace" }}>
        <span>HP: {hud.hp}/{hud.maxHp}</span>
        <span>SCORE: {hud.score}</span>
        {stage.timeLimit > 0 && <span>TIME: {Math.max(0, stage.timeLimit - hud.time)}s</span>}
      </div>
      {/* ステータス */}
      {status === "clear" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#FFD700", fontSize: 36, fontFamily: "monospace", letterSpacing: 4 }}>
          STAGE CLEAR!
        </div>
      )}
      {status === "gameover" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#EF5350", fontSize: 36, fontFamily: "monospace", letterSpacing: 4 }}>
          GAME OVER
        </div>
      )}
      {/* 操作説明 */}
      <div style={{ fontSize: 10, color: "#555", marginTop: 4, fontFamily: "monospace" }}>
        ← → Move | Space Jump | Z Attack | P Pause | F1 Debug | Esc Back
      </div>
    </div>
  );
}

// --- 衝突判定 ---
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function getTile(colMap, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (ty < 0 || ty >= colMap.length || tx < 0 || tx >= (colMap[0]?.length || 0)) return false;
  return colMap[ty][tx];
}

function moveAndCollide(entity, colMap, mapData, dt) {
  // X移動
  entity.x += entity.vx;
  // X衝突
  if (entity.vx > 0) {
    const right = entity.x + entity.width;
    if (getTile(colMap, right, entity.y + 2) || getTile(colMap, right, entity.y + entity.height - 2)) {
      entity.x = Math.floor(right / TILE_SIZE) * TILE_SIZE - entity.width;
      entity.vx = 0;
    }
  } else if (entity.vx < 0) {
    if (getTile(colMap, entity.x, entity.y + 2) || getTile(colMap, entity.x, entity.y + entity.height - 2)) {
      entity.x = Math.floor(entity.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
      entity.vx = 0;
    }
  }

  // Y移動
  entity.y += entity.vy;
  entity.grounded = false;
  // Y衝突（下）
  if (entity.vy >= 0) {
    const bottom = entity.y + entity.height;
    if (getTile(colMap, entity.x + 2, bottom) || getTile(colMap, entity.x + entity.width - 2, bottom)) {
      entity.y = Math.floor(bottom / TILE_SIZE) * TILE_SIZE - entity.height;
      entity.vy = 0;
      entity.grounded = true;
    }
  }
  // Y衝突（上）
  if (entity.vy < 0) {
    if (getTile(colMap, entity.x + 2, entity.y) || getTile(colMap, entity.x + entity.width - 2, entity.y)) {
      entity.y = Math.floor(entity.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
      entity.vy = 0;
    }
  }
}

// --- 描画 ---
function draw(canvas, gs, colMap, mapData, showDebug) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // カメラ（プレイヤー中心）
  const camX = Math.max(0, Math.min(gs.player.x - w / 2 + gs.player.width / 2, (mapData?.width || 20) * TILE_SIZE - w));
  const camY = Math.max(0, Math.min(gs.player.y - h / 2 + gs.player.height / 2, (mapData?.height || 12) * TILE_SIZE - h));

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(-camX, -camY);

  // タイルマップ描画
  if (mapData && mapData.layers) {
    const terrain = mapData.layers[0]?.tiles || [];
    for (let y = 0; y < terrain.length; y++) {
      for (let x = 0; x < terrain[y].length; x++) {
        const tile = terrain[y][x];
        if (!tile) continue;
        ctx.fillStyle = tileColor(tile);
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        if (showDebug) {
          ctx.strokeStyle = "rgba(255,255,255,0.1)";
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  // ゴール
  if (gs.player && !gs.cleared && mapData) {
    const gp = { x: (mapData.goalPoint?.x || mapData.width - 2), y: (mapData.goalPoint?.y || mapData.height - 2) };
    ctx.fillStyle = "rgba(255,215,0,0.3)";
    ctx.fillRect(gp.x * TILE_SIZE, gp.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "#FFD700";
    ctx.strokeRect(gp.x * TILE_SIZE, gp.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  // アイテム
  gs.items.forEach((item) => {
    if (item.collected) return;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(item.x + 8, item.y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 敵
  gs.enemies.forEach((e) => {
    if (!e.alive) return;
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.width, e.height);
    // HP バー
    const hpRatio = e.hp / e.maxHp;
    ctx.fillStyle = "#333";
    ctx.fillRect(e.x, e.y - 6, e.width, 3);
    ctx.fillStyle = hpRatio > 0.5 ? "#4f4" : hpRatio > 0.25 ? "#ff0" : "#f44";
    ctx.fillRect(e.x, e.y - 6, e.width * hpRatio, 3);

    if (showDebug) {
      ctx.strokeStyle = "#f00";
      ctx.strokeRect(e.x, e.y, e.width, e.height);
    }
  });

  // プレイヤー
  const p = gs.player;
  const blink = p.invincible > 0 && Math.floor(p.invincible * 4) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = "#4af";
    ctx.fillRect(p.x, p.y, p.width, p.height);
    // 顔
    ctx.fillStyle = "#fff";
    const eyeX = p.facing > 0 ? p.x + p.width - 8 : p.x + 4;
    ctx.fillRect(eyeX, p.y + 8, 4, 4);
  }

  // 攻撃エフェクト
  if (p.attacking) {
    ctx.fillStyle = "rgba(255,255,100,0.4)";
    const atkRange = actionData.playerConfig?.attacks?.[0]?.range || 32;
    const atkX = p.facing > 0 ? p.x + p.width : p.x - atkRange;
    ctx.fillRect(atkX, p.y, atkRange, p.height);
  }

  if (showDebug) {
    ctx.strokeStyle = "#0f0";
    ctx.strokeRect(p.x, p.y, p.width, p.height);
  }

  ctx.restore();

  // デバッグ情報
  if (showDebug) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, h - 40, 300, 40);
    ctx.fillStyle = "#0f0";
    ctx.font = "10px monospace";
    ctx.fillText(`Player: (${Math.floor(p.x)}, ${Math.floor(p.y)}) vx=${p.vx.toFixed(1)} vy=${p.vy.toFixed(1)} grounded=${p.grounded}`, 4, h - 26);
    ctx.fillText(`Enemies: ${gs.enemies.filter((e) => e.alive).length}/${gs.enemies.length} | Items: ${gs.items.filter((i) => i.collected).length}/${gs.items.length}`, 4, h - 12);
  }
}

function tileColor(tile) {
  const colors = {
    grass: "#4a8c3f", dirt: "#8B6914", water: "#2196F3",
    stone: "#777", wall: "#555", sand: "#D4A76A",
    lava: "#FF5722", ice: "#B3E5FC", brick: "#8B4513",
  };
  return colors[tile] || "#666";
}
