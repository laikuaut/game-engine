// 敵AI更新

const TILE_SIZE = 32;
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 8;

export function updateEnemies(gs, colMap, mapData, dt) {
  const player = gs.player;

  gs.enemies.forEach((e) => {
    if (!e.alive) return;

    // 重力
    e.vy += GRAVITY * dt;
    if (e.vy > MAX_FALL_SPEED) e.vy = MAX_FALL_SPEED;

    // 行動パターン
    switch (e.behavior) {
      case "patrol":
        updatePatrol(e, colMap, dt);
        break;
      case "chase":
        updateChase(e, player, colMap, dt);
        break;
      case "fly_sine":
        updateFlySine(e, dt);
        break;
      case "stationary":
        // 動かない
        e.vx = 0;
        break;
      case "boss":
        updateBoss(e, player, colMap, dt);
        break;
      default:
        updatePatrol(e, colMap, dt);
    }

    // 移動と衝突
    moveEnemy(e, colMap, dt);
  });
}

// パトロール（左右往復）
function updatePatrol(e, colMap, dt) {
  e.vx = e.speed * e.patrolDir * dt;
  e.facing = e.patrolDir;
  e.patrolDist += Math.abs(e.vx);

  if (e.patrolDist >= e.patrolMax) {
    e.patrolDir *= -1;
    e.patrolDist = 0;
  }
}

// 追跡（プレイヤーに向かって移動）
function updateChase(e, player, colMap, dt) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 検知範囲（8タイル分）
  if (dist < 8 * TILE_SIZE) {
    e.vx = (dx > 0 ? 1 : -1) * e.speed * dt;
    e.facing = dx > 0 ? 1 : -1;
    // ジャンプ（壁にぶつかったら）
    if (e.grounded && e.wallHit) {
      e.vy = -8;
      e.wallHit = false;
    }
  } else {
    // 範囲外はパトロール
    updatePatrol(e, colMap, dt);
  }
}

// 正弦波飛行
function updateFlySine(e, dt) {
  e._flyTime = (e._flyTime || 0) + dt * 0.05;
  e.vx = e.speed * e.patrolDir * dt;
  e.vy = Math.sin(e._flyTime) * 2;
  e.facing = e.patrolDir;
  e.patrolDist += Math.abs(e.vx);
  if (e.patrolDist >= e.patrolMax) {
    e.patrolDir *= -1;
    e.patrolDist = 0;
  }
  e.grounded = false; // 飛行中は着地しない
}

// ボスAI
function updateBoss(e, player, colMap, dt) {
  const dx = player.x - e.x;
  // 常にプレイヤーに向かう
  e.vx = (dx > 0 ? 1 : -1) * e.speed * 0.7 * dt;
  e.facing = dx > 0 ? 1 : -1;

  // たまにジャンプ
  if (e.grounded && Math.random() < 0.02) {
    e.vy = -12;
  }
}

// 敵の移動と衝突
function moveEnemy(e, colMap, dt) {
  // X移動
  e.x += e.vx;
  e.wallHit = false;
  if (e.vx > 0) {
    const right = e.x + e.width;
    if (getTile(colMap, right, e.y + 2) || getTile(colMap, right, e.y + e.height - 2)) {
      e.x = Math.floor(right / TILE_SIZE) * TILE_SIZE - e.width;
      e.vx = 0;
      e.patrolDir *= -1;
      e.patrolDist = 0;
      e.wallHit = true;
    }
  } else if (e.vx < 0) {
    if (getTile(colMap, e.x, e.y + 2) || getTile(colMap, e.x, e.y + e.height - 2)) {
      e.x = Math.floor(e.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
      e.vx = 0;
      e.patrolDir *= -1;
      e.patrolDist = 0;
      e.wallHit = true;
    }
  }

  // Y移動
  if (e.behavior !== "fly_sine") {
    e.y += e.vy;
    e.grounded = false;
    if (e.vy >= 0) {
      const bottom = e.y + e.height;
      if (getTile(colMap, e.x + 2, bottom) || getTile(colMap, e.x + e.width - 2, bottom)) {
        e.y = Math.floor(bottom / TILE_SIZE) * TILE_SIZE - e.height;
        e.vy = 0;
        e.grounded = true;
      }
    }
  } else {
    e.y += e.vy;
  }

  // 崖検知（パトロール時: 足元が空なら反転）
  if (e.behavior === "patrol" && e.grounded) {
    const checkX = e.patrolDir > 0 ? e.x + e.width + 2 : e.x - 2;
    const checkY = e.y + e.height + 2;
    if (!getTile(colMap, checkX, checkY)) {
      e.patrolDir *= -1;
      e.patrolDist = 0;
    }
  }
}

function getTile(colMap, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (ty < 0 || ty >= colMap.length || tx < 0 || tx >= (colMap[0]?.length || 0)) return false;
  return colMap[ty][tx];
}
