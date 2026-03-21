import { useEffect, useCallback, useRef } from "react";

// タイルの色マップ
const TILE_COLORS = {
  grass: "#4a7a3a", tree: "#2d5a1e", dirt: "#8B7355", stone: "#888",
  water: "#3a6a9a", exit: "#6a4a2a", sand: "#c2b280", lava: "#cc3300",
  null: "transparent",
};
const OBJ_COLORS = {
  npc: "#FFD700", chest: "#DAA520", enemy: "#FF4444",
  door: "#8B4513", spawn: "#5BF", sign: "#aaa",
};

export default function MapRenderer({ map, playerPos, onMove, onEvent }) {
  const canvasRef = useRef(null);
  const tileSize = 32;

  // マップ描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext("2d");
    const w = map.width * tileSize;
    const h = map.height * tileSize;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    // レイヤー描画
    map.layers.forEach((layer) => {
      if (!layer.tiles) return;
      layer.tiles.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (!tile) return;
          const colors = layer.type === "collision" ? null : (layer.name === "オブジェクト" ? OBJ_COLORS : TILE_COLORS);
          if (!colors) return;
          const color = colors[tile] || "#555";
          ctx.fillStyle = color;
          if (layer.name === "オブジェクト") {
            // オブジェクトは小さく描画
            ctx.fillRect(x * tileSize + 6, y * tileSize + 6, tileSize - 12, tileSize - 12);
          } else {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            // グリッド線
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
          }
        });
      });
    });

    // プレイヤー描画
    ctx.fillStyle = "#5BF";
    ctx.beginPath();
    ctx.arc(
      playerPos.x * tileSize + tileSize / 2,
      playerPos.y * tileSize + tileSize / 2,
      tileSize / 3, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("P", playerPos.x * tileSize + tileSize / 2, playerPos.y * tileSize + tileSize / 2 + 3);

    // イベントマーカー
    (map.events || []).forEach((ev) => {
      ctx.strokeStyle = ev.trigger === "auto" ? "#FA0" : "#0AF";
      ctx.lineWidth = 2;
      ctx.strokeRect(ev.x * tileSize + 2, ev.y * tileSize + 2, tileSize - 4, tileSize - 4);
    });
  }, [map, playerPos, tileSize]);

  // キー入力で移動
  const handleKeyDown = useCallback((e) => {
    const dirs = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    };
    const dir = dirs[e.key];
    if (!dir) return;
    e.preventDefault();

    const nx = playerPos.x + dir.x;
    const ny = playerPos.y + dir.y;

    // 範囲外チェック
    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return;

    // 衝突判定（tree, water は通行不可）
    const groundLayer = map.layers.find((l) => l.name === "地形");
    if (groundLayer) {
      const tile = groundLayer.tiles[ny]?.[nx];
      if (tile === "tree" || tile === "water") return;
    }

    onMove({ x: nx, y: ny });

    // イベントチェック
    const event = (map.events || []).find((ev) => ev.x === nx && ev.y === ny);
    if (event) {
      if (event.trigger === "auto" || (event.trigger === "action" && (e.key === " " || e.key === "Enter"))) {
        onEvent(event);
      }
    }
  }, [playerPos, map, onMove, onEvent]);

  // action トリガー（スペース/Enter）
  const handleAction = useCallback((e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    // 現在位置のイベント
    const event = (map.events || []).find((ev) => ev.x === playerPos.x && ev.y === playerPos.y && ev.trigger === "action");
    if (event) onEvent(event);
    // 隣接タイルのイベント
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for (const d of dirs) {
      const adj = (map.events || []).find((ev) =>
        ev.x === playerPos.x + d.x && ev.y === playerPos.y + d.y && ev.trigger === "action"
      );
      if (adj) { onEvent(adj); break; }
    }
  }, [playerPos, map, onEvent]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleAction);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleAction);
    };
  }, [handleKeyDown, handleAction]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        border: "2px solid rgba(200,180,140,0.3)",
        borderRadius: 4,
        imageRendering: "pixelated",
        maxWidth: "80%", maxHeight: "80%",
      }}
    />
  );
}
