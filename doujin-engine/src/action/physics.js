// 物理演算ユーティリティ

const TILE_SIZE = 32;
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 12;

export function createPhysicsWorld(config = {}) {
  return {
    gravity: config.gravity || GRAVITY,
    maxFallSpeed: config.maxFallSpeed || MAX_FALL_SPEED,
    tileSize: TILE_SIZE,
  };
}

// AABB 衝突判定
export function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// タイル取得
export function getTile(colMap, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (ty < 0 || ty >= colMap.length || tx < 0 || tx >= (colMap[0]?.length || 0)) return false;
  return colMap[ty][tx];
}

// エンティティの移動と衝突解決
export function moveAndCollide(entity, colMap, dt) {
  // X移動
  entity.x += entity.vx;
  if (entity.vx > 0) {
    const right = entity.x + entity.width;
    if (getTile(colMap, right, entity.y + 2) || getTile(colMap, right, entity.y + entity.height - 2)) {
      entity.x = Math.floor(right / TILE_SIZE) * TILE_SIZE - entity.width;
      entity.vx = 0;
      return "right";
    }
  } else if (entity.vx < 0) {
    if (getTile(colMap, entity.x, entity.y + 2) || getTile(colMap, entity.x, entity.y + entity.height - 2)) {
      entity.x = Math.floor(entity.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
      entity.vx = 0;
      return "left";
    }
  }

  // Y移動
  entity.y += entity.vy;
  entity.grounded = false;
  if (entity.vy >= 0) {
    const bottom = entity.y + entity.height;
    if (getTile(colMap, entity.x + 2, bottom) || getTile(colMap, entity.x + entity.width - 2, bottom)) {
      entity.y = Math.floor(bottom / TILE_SIZE) * TILE_SIZE - entity.height;
      entity.vy = 0;
      entity.grounded = true;
      return "bottom";
    }
  }
  if (entity.vy < 0) {
    if (getTile(colMap, entity.x + 2, entity.y) || getTile(colMap, entity.x + entity.width - 2, entity.y)) {
      entity.y = Math.floor(entity.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
      entity.vy = 0;
      return "top";
    }
  }
  return null;
}

// 重力適用
export function applyGravity(entity, gravity, maxFall, dt) {
  entity.vy += gravity * dt;
  if (entity.vy > maxFall) entity.vy = maxFall;
}

export function updatePhysics() {
  // プレースホルダー（ActionEngine内で個別に処理）
}
