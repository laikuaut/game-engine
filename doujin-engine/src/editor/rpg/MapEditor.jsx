import { useState, useCallback, useRef } from "react";
import { uploadAsset, getAssetUrl, deleteAsset, listAssets } from "../../project/ProjectStore";

// 組み込みタイルパレット定義
const BUILTIN_TILES = [
  { id: "grass",  label: "草地",   color: "#4CAF50", char: "." },
  { id: "dirt",   label: "土",     color: "#8D6E63", char: "," },
  { id: "water",  label: "水",     color: "#42A5F5", char: "~" },
  { id: "stone",  label: "石畳",   color: "#9E9E9E", char: "#" },
  { id: "wall",   label: "壁",     color: "#5D4037", char: "W" },
  { id: "tree",   label: "木",     color: "#2E7D32", char: "T" },
  { id: "sand",   label: "砂",     color: "#FFD54F", char: ":" },
  { id: "lava",   label: "溶岩",   color: "#E53935", char: "L" },
  { id: "ice",    label: "氷",     color: "#B3E5FC", char: "I" },
  { id: "door",   label: "扉",     color: "#FFA726", char: "D" },
  { id: "chest",  label: "宝箱",   color: "#FFD600", char: "C" },
  { id: "npc",    label: "NPC",    color: "#AB47BC", char: "N" },
  { id: "enemy",  label: "敵",     color: "#F44336", char: "E" },
  { id: "spawn",  label: "開始点", color: "#00E676", char: "S" },
  { id: "exit",   label: "出口",   color: "#26C6DA", char: "X" },
];

const DEFAULT_MAP = {
  name: "新規マップ",
  width: 16,
  height: 12,
  tileSize: 32,
  layers: [
    { name: "地形", tiles: [] },
    { name: "オブジェクト", tiles: [] },
  ],
  events: [],
};

function createEmptyGrid(w, h, fill = "grass") {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

export default function MapEditor({ maps: initialMaps, onUpdateMaps, projectId, customTiles: initialCustomTiles, onUpdateCustomTiles }) {
  const [maps, setMaps] = useState(initialMaps || []);
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useState("grass");
  const [activeLayer, setActiveLayer] = useState(0);
  const [tool, setTool] = useState("paint");
  const [isPainting, setIsPainting] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [editingEventIdx, setEditingEventIdx] = useState(-1);
  const [showTileManager, setShowTileManager] = useState(false);
  const [newTileId, setNewTileId] = useState("");
  const [newTileLabel, setNewTileLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // カスタムタイル（プロジェクトに保存される）
  const customTiles = initialCustomTiles || [];

  // 全タイル（組み込み + カスタム）
  const allTiles = [...BUILTIN_TILES, ...customTiles];
  const TILE_MAP = Object.fromEntries(allTiles.map((t) => [t.id, t]));

  const currentMap = maps[selectedMapIndex] || null;

  const updateMap = useCallback((index, updates) => {
    setMaps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      onUpdateMaps?.(next);
      return next;
    });
  }, [onUpdateMaps]);

  const addMap = useCallback(() => {
    const newMap = {
      ...DEFAULT_MAP,
      name: `マップ ${maps.length + 1}`,
      layers: [
        { name: "地形", tiles: createEmptyGrid(16, 12, "grass") },
        { name: "オブジェクト", tiles: createEmptyGrid(16, 12, null) },
      ],
    };
    const next = [...maps, newMap];
    setMaps(next);
    setSelectedMapIndex(next.length - 1);
    onUpdateMaps?.(next);
  }, [maps, onUpdateMaps]);

  const removeMap = useCallback((index) => {
    if (maps.length <= 1) return;
    const next = maps.filter((_, i) => i !== index);
    setMaps(next);
    setSelectedMapIndex(Math.max(0, selectedMapIndex - 1));
    onUpdateMaps?.(next);
  }, [maps, selectedMapIndex, onUpdateMaps]);

  const paintTile = useCallback((row, col) => {
    if (!currentMap) return;
    const layer = currentMap.layers[activeLayer];
    if (!layer?.tiles) return;
    const newTiles = layer.tiles.map((r) => [...r]);
    newTiles[row][col] = tool === "eraser" ? null : selectedTile;
    const newLayers = [...currentMap.layers];
    newLayers[activeLayer] = { ...layer, tiles: newTiles };
    updateMap(selectedMapIndex, { layers: newLayers });
  }, [currentMap, activeLayer, selectedTile, tool, selectedMapIndex, updateMap]);

  const addEvent = useCallback((row, col) => {
    if (!currentMap) return;
    const newEvent = {
      id: Date.now().toString(36),
      x: col, y: row,
      type: "dialog",
      trigger: "action",
      data: { speaker: "", text: "イベントテキスト" },
    };
    const newEvents = [...(currentMap.events || []), newEvent];
    updateMap(selectedMapIndex, { events: newEvents });
    setEditingEventIdx(newEvents.length - 1);
  }, [currentMap, selectedMapIndex, updateMap]);

  const updateEvent = useCallback((idx, updates) => {
    if (!currentMap) return;
    const newEvents = [...(currentMap.events || [])];
    newEvents[idx] = { ...newEvents[idx], ...updates };
    updateMap(selectedMapIndex, { events: newEvents });
  }, [currentMap, selectedMapIndex, updateMap]);

  const resizeMap = useCallback((newW, newH) => {
    if (!currentMap) return;
    const newLayers = currentMap.layers.map((layer) => {
      const oldTiles = layer.tiles || [];
      const newTiles = Array.from({ length: newH }, (_, r) =>
        Array.from({ length: newW }, (_, c) =>
          r < oldTiles.length && c < (oldTiles[r]?.length || 0) ? oldTiles[r][c] : null
        )
      );
      return { ...layer, tiles: newTiles };
    });
    updateMap(selectedMapIndex, { width: newW, height: newH, layers: newLayers });
  }, [currentMap, selectedMapIndex, updateMap]);

  // マップランダム生成
  const randomGenerate = useCallback(() => {
    if (!currentMap) return;
    const w = currentMap.width;
    const h = currentMap.height;
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // --- 地形レイヤー生成 ---
    const terrain = Array.from({ length: h }, () => Array(w).fill("grass"));

    // パーリンノイズ風のシンプルな地形生成
    // 1) 外周を壁 or 木で囲む
    for (let x = 0; x < w; x++) { terrain[0][x] = "tree"; terrain[h - 1][x] = "tree"; }
    for (let y = 0; y < h; y++) { terrain[y][0] = "tree"; terrain[y][w - 1] = "tree"; }

    // 2) ランダムに地形バリエーションを散りばめる
    const terrainTypes = ["grass", "grass", "grass", "dirt", "dirt", "stone", "sand"];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        terrain[y][x] = rand(terrainTypes);
      }
    }

    // 3) 水たまり（2〜3箇所）
    const ponds = 2 + Math.floor(Math.random() * 2);
    for (let p = 0; p < ponds; p++) {
      const cx = 2 + Math.floor(Math.random() * (w - 4));
      const cy = 2 + Math.floor(Math.random() * (h - 4));
      const size = 1 + Math.floor(Math.random() * 2);
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const ny = cy + dy, nx = cx + dx;
          if (ny > 0 && ny < h - 1 && nx > 0 && nx < w - 1) {
            if (Math.abs(dx) + Math.abs(dy) <= size + 1) terrain[ny][nx] = "water";
          }
        }
      }
    }

    // 4) 木の塊（3〜5箇所）
    const groves = 3 + Math.floor(Math.random() * 3);
    for (let g = 0; g < groves; g++) {
      const cx = 2 + Math.floor(Math.random() * (w - 4));
      const cy = 2 + Math.floor(Math.random() * (h - 4));
      const count = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const nx = cx + Math.floor(Math.random() * 3) - 1;
        const ny = cy + Math.floor(Math.random() * 3) - 1;
        if (ny > 0 && ny < h - 1 && nx > 0 && nx < w - 1) terrain[ny][nx] = "tree";
      }
    }

    // 5) 道（横 or 縦に1本）
    if (Math.random() > 0.5) {
      const roadY = 2 + Math.floor(Math.random() * (h - 4));
      for (let x = 1; x < w - 1; x++) terrain[roadY][x] = "stone";
    } else {
      const roadX = 2 + Math.floor(Math.random() * (w - 4));
      for (let y = 1; y < h - 1; y++) terrain[y][roadX] = "stone";
    }

    // --- オブジェクトレイヤー生成 ---
    const objects = Array.from({ length: h }, () => Array(w).fill(null));

    // 開始点
    let spawnX, spawnY;
    do {
      spawnX = 1 + Math.floor(Math.random() * (w - 2));
      spawnY = 1 + Math.floor(Math.random() * (h - 2));
    } while (terrain[spawnY][spawnX] === "water" || terrain[spawnY][spawnX] === "tree");
    objects[spawnY][spawnX] = "spawn";
    terrain[spawnY][spawnX] = "grass"; // 開始点は歩けるように

    // 出口
    let exitX, exitY;
    do {
      exitX = 1 + Math.floor(Math.random() * (w - 2));
      exitY = 1 + Math.floor(Math.random() * (h - 2));
    } while (terrain[exitY][exitX] === "water" || terrain[exitY][exitX] === "tree" || (exitX === spawnX && exitY === spawnY));
    objects[exitY][exitX] = "exit";
    terrain[exitY][exitX] = "dirt";

    // NPC（1〜3体）
    const npcCount = 1 + Math.floor(Math.random() * 3);
    for (let n = 0; n < npcCount; n++) {
      let nx, ny, tries = 0;
      do {
        nx = 1 + Math.floor(Math.random() * (w - 2));
        ny = 1 + Math.floor(Math.random() * (h - 2));
        tries++;
      } while ((terrain[ny][nx] === "water" || terrain[ny][nx] === "tree" || objects[ny][nx]) && tries < 50);
      if (tries < 50) objects[ny][nx] = "npc";
    }

    // 宝箱（1〜2個）
    const chestCount = 1 + Math.floor(Math.random() * 2);
    for (let c = 0; c < chestCount; c++) {
      let cx, cy, tries = 0;
      do {
        cx = 1 + Math.floor(Math.random() * (w - 2));
        cy = 1 + Math.floor(Math.random() * (h - 2));
        tries++;
      } while ((terrain[cy][cx] === "water" || terrain[cy][cx] === "tree" || objects[cy][cx]) && tries < 50);
      if (tries < 50) objects[cy][cx] = "chest";
    }

    // 敵（2〜4体）
    const enemyCount = 2 + Math.floor(Math.random() * 3);
    for (let e = 0; e < enemyCount; e++) {
      let ex, ey, tries = 0;
      do {
        ex = 1 + Math.floor(Math.random() * (w - 2));
        ey = 1 + Math.floor(Math.random() * (h - 2));
        tries++;
      } while ((terrain[ey][ex] === "water" || terrain[ey][ex] === "tree" || objects[ey][ex]) && tries < 50);
      if (tries < 50) objects[ey][ex] = "enemy";
    }

    const newLayers = [
      { name: "地形", tiles: terrain },
      { name: "オブジェクト", tiles: objects },
    ];
    updateMap(selectedMapIndex, { layers: newLayers, events: [] });
  }, [currentMap, selectedMapIndex, updateMap]);

  // カスタムタイル画像アップロード
  const handleTileImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    const id = newTileId.trim() || `tile_${Date.now().toString(36)}`;
    const label = newTileLabel.trim() || id;

    // 既存IDチェック
    if (allTiles.some((t) => t.id === id)) {
      alert(`タイルID "${id}" は既に存在します`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const uploadName = `tile_${id}.${ext}`;
      const renamedFile = new File([file], uploadName, { type: file.type });
      const result = await uploadAsset(projectId, "tile", renamedFile);
      if (result.success) {
        const newTile = {
          id,
          label,
          color: "#888",
          char: id[0]?.toUpperCase() || "?",
          image: result.filename,
        };
        const updated = [...customTiles, newTile];
        onUpdateCustomTiles?.(updated);
        setNewTileId("");
        setNewTileLabel("");
      }
    } catch (err) {
      console.error("タイル画像アップロード失敗:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [projectId, newTileId, newTileLabel, customTiles, allTiles, onUpdateCustomTiles]);

  // カスタムタイル削除
  const removeCustomTile = useCallback(async (tileId) => {
    const tile = customTiles.find((t) => t.id === tileId);
    if (!tile) return;
    if (tile.image && projectId) {
      await deleteAsset(projectId, "tile", tile.image);
    }
    const updated = customTiles.filter((t) => t.id !== tileId);
    onUpdateCustomTiles?.(updated);
    if (selectedTile === tileId) setSelectedTile("grass");
  }, [customTiles, projectId, selectedTile, onUpdateCustomTiles]);

  // タイル画像URLを取得
  const getTileImageUrl = (tile) => {
    if (!tile?.image || !projectId) return null;
    return getAssetUrl(projectId, "tile", tile.image);
  };

  // タイルのプレビュー（画像 or 色）
  const renderTilePreview = (tile, size = "100%") => {
    const imgUrl = getTileImageUrl(tile);
    if (imgUrl) {
      return (
        <img
          src={imgUrl}
          alt={tile.label}
          style={{ width: size, height: size, objectFit: "cover", imageRendering: "pixelated", borderRadius: "inherit" }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      );
    }
    return <span style={styles.paletteChar}>{tile.char}</span>;
  };

  return (
    <div style={styles.container}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleTileImageUpload}
      />

      {/* 左: サイドバー */}
      <div style={styles.sidebar}>
        {/* マップリスト */}
        <div style={styles.sideSection}>
          <div style={styles.sideHeader}>
            <span>マップ一覧</span>
            <button onClick={addMap} style={styles.addBtn}>＋</button>
          </div>
          {maps.map((m, i) => (
            <div
              key={i}
              onClick={() => setSelectedMapIndex(i)}
              style={{
                ...styles.mapItem,
                background: i === selectedMapIndex ? "rgba(200,180,140,0.12)" : "transparent",
                borderLeft: i === selectedMapIndex ? "3px solid #E8D4B0" : "3px solid transparent",
              }}
            >
              <span style={styles.mapName}>{m.name}</span>
              <span style={styles.mapSize}>{m.width}x{m.height}</span>
            </div>
          ))}
          {maps.length === 0 && <div style={styles.emptyMsg}>マップを追加してください</div>}
        </div>

        {/* ツール */}
        <div style={styles.sideSection}>
          <div style={styles.sideHeader}>ツール</div>
          <div style={styles.toolBar}>
            {[
              { id: "paint", label: "ペン" },
              { id: "eraser", label: "消しゴム" },
            ].map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)}
                style={{ ...styles.toolBtn, ...(tool === t.id ? styles.toolBtnActive : {}) }}>
                {t.label}
              </button>
            ))}
            <button onClick={() => setShowEvents(!showEvents)}
              style={{ ...styles.toolBtn, ...(showEvents ? styles.toolBtnActive : {}) }}>
              イベント
            </button>
            <button onClick={() => setShowTileManager(!showTileManager)}
              style={{ ...styles.toolBtn, ...(showTileManager ? styles.toolBtnActive : {}) }}>
              タイル管理
            </button>
          </div>
        </div>

        {/* レイヤー */}
        {currentMap && (
          <div style={styles.sideSection}>
            <div style={styles.sideHeader}>レイヤー</div>
            {currentMap.layers.map((layer, i) => (
              <div key={i} onClick={() => setActiveLayer(i)}
                style={{
                  ...styles.layerItem,
                  background: i === activeLayer ? "rgba(90,180,255,0.12)" : "transparent",
                  color: i === activeLayer ? "#5BF" : "#888",
                }}>
                {layer.name}
              </div>
            ))}
          </div>
        )}

        {/* タイルパレット */}
        <div style={{ ...styles.sideSection, overflowY: "auto" }}>
          <div style={styles.sideHeader}>タイル</div>
          <div style={styles.palette}>
            {allTiles.map((tile) => {
              const imgUrl = getTileImageUrl(tile);
              return (
                <div
                  key={tile.id}
                  onClick={() => { setSelectedTile(tile.id); setTool("paint"); }}
                  title={tile.label}
                  style={{
                    ...styles.paletteTile,
                    background: imgUrl ? "transparent" : tile.color,
                    outline: selectedTile === tile.id ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  {renderTilePreview(tile)}
                </div>
              );
            })}
          </div>
        </div>

        {/* イベント一覧（サイドバー内） */}
        {showEvents && currentMap && (
          <div style={{ ...styles.sideSection, flex: 1, overflowY: "auto", minHeight: 0 }}>
            <div style={styles.sideHeader}>
              <span>イベント ({(currentMap.events || []).length})</span>
              <button onClick={() => addEvent(0, 0)} style={styles.addBtn} title="イベント追加">＋</button>
            </div>
            {(currentMap.events || []).map((evt, i) => (
              <div
                key={evt.id || i}
                onClick={() => setEditingEventIdx(editingEventIdx === i ? -1 : i)}
                style={{
                  ...styles.eventSideItem,
                  background: editingEventIdx === i ? "rgba(200,180,140,0.12)" : "transparent",
                  borderLeft: editingEventIdx === i ? "3px solid #E8D4B0" : "3px solid transparent",
                }}
              >
                <span style={styles.eventSidePos}>({evt.x},{evt.y})</span>
                <span style={styles.eventSideType}>{evt.type}</span>
                <button onClick={(e) => {
                  e.stopPropagation();
                  const newEvents = (currentMap.events || []).filter((_, j) => j !== i);
                  updateMap(selectedMapIndex, { events: newEvents });
                  if (editingEventIdx === i) setEditingEventIdx(-1);
                  else if (editingEventIdx > i) setEditingEventIdx(editingEventIdx - 1);
                }} style={styles.eventSideDelBtn}>✕</button>
              </div>
            ))}
            {(currentMap.events || []).length === 0 && (
              <div style={{ color: "#555", fontSize: 10, padding: "6px 10px" }}>
                右クリックでマップ上に追加
              </div>
            )}
          </div>
        )}
      </div>

      {/* 中央: マップグリッド */}
      <div style={styles.main}>
        {/* タイル管理パネル */}
        {showTileManager && (
          <div style={styles.tileManagerPanel}>
            <div style={styles.tileManagerHeader}>カスタムタイル管理</div>
            <div style={styles.tileManagerHelp}>
              ドット絵画像（32×32px推奨）を登録すると、タイルパレットに追加されます
            </div>

            {/* 登録済みカスタムタイル */}
            {customTiles.length > 0 && (
              <div style={styles.customTileList}>
                {customTiles.map((tile) => (
                  <div key={tile.id} style={styles.customTileRow}>
                    <div style={{ ...styles.customTileThumb, overflow: "hidden" }}>
                      {renderTilePreview(tile, 28)}
                    </div>
                    <span style={styles.customTileId}>{tile.id}</span>
                    <span style={styles.customTileLabel}>{tile.label}</span>
                    <button onClick={() => removeCustomTile(tile.id)} style={styles.customTileDelBtn}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* 新規追加フォーム */}
            <div style={styles.tileAddForm}>
              <input
                value={newTileId}
                onChange={(e) => setNewTileId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="タイルID (英数字)"
                style={styles.tileAddInput}
              />
              <input
                value={newTileLabel}
                onChange={(e) => setNewTileLabel(e.target.value)}
                placeholder="表示名"
                style={styles.tileAddInput}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !newTileId.trim()}
                style={{
                  ...styles.tileAddBtn,
                  opacity: uploading || !newTileId.trim() ? 0.5 : 1,
                }}
              >
                {uploading ? "アップロード中..." : "画像を選択して追加"}
              </button>
            </div>
          </div>
        )}

        {currentMap ? (
          <>
            {/* マップヘッダー */}
            <div style={styles.mapHeader}>
              <input
                type="text"
                value={currentMap.name}
                onChange={(e) => updateMap(selectedMapIndex, { name: e.target.value })}
                style={styles.mapNameInput}
              />
              <div style={styles.mapControls}>
                <label style={styles.sizeLabel}>W:
                  <input type="number" value={currentMap.width} min={4} max={64}
                    onChange={(e) => resizeMap(Number(e.target.value), currentMap.height)}
                    style={styles.sizeInput} />
                </label>
                <label style={styles.sizeLabel}>H:
                  <input type="number" value={currentMap.height} min={4} max={64}
                    onChange={(e) => resizeMap(currentMap.width, Number(e.target.value))}
                    style={styles.sizeInput} />
                </label>
                <button onClick={randomGenerate} style={styles.randomBtn}>ランダム生成</button>
                <button onClick={() => removeMap(selectedMapIndex)} style={styles.deleteMapBtn}>削除</button>
              </div>
            </div>

            {/* グリッド */}
            <div style={styles.gridContainer}>
              <div
                style={{
                  display: "inline-grid",
                  gridTemplateColumns: `repeat(${currentMap.width}, ${currentMap.tileSize}px)`,
                  gap: 1,
                  background: "rgba(255,255,255,0.05)",
                  padding: 1,
                }}
                onMouseLeave={() => setIsPainting(false)}
              >
                {Array.from({ length: currentMap.height }, (_, row) =>
                  Array.from({ length: currentMap.width }, (_, col) => {
                    let tileId = null;
                    for (let l = currentMap.layers.length - 1; l >= 0; l--) {
                      const t = currentMap.layers[l]?.tiles?.[row]?.[col];
                      if (t) { tileId = t; break; }
                    }
                    const tileData = tileId ? TILE_MAP[tileId] : null;
                    const tileImg = getTileImageUrl(tileData);
                    const evt = showEvents && (currentMap.events || []).find((e) => e.x === col && e.y === row);

                    return (
                      <div
                        key={`${row}-${col}`}
                        onMouseDown={() => { setIsPainting(true); paintTile(row, col); }}
                        onMouseEnter={() => { if (isPainting) paintTile(row, col); }}
                        onMouseUp={() => setIsPainting(false)}
                        onContextMenu={(e) => { e.preventDefault(); if (showEvents) addEvent(row, col); }}
                        style={{
                          width: currentMap.tileSize,
                          height: currentMap.tileSize,
                          background: tileImg ? "transparent" : (tileData ? tileData.color : "rgba(0,0,0,0.3)"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "crosshair",
                          position: "relative",
                          userSelect: "none",
                          overflow: "hidden",
                        }}
                      >
                        {tileImg ? (
                          <img src={tileImg} alt="" style={{
                            width: "100%", height: "100%", objectFit: "cover",
                            imageRendering: "pixelated",
                          }} />
                        ) : tileData ? (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                            {tileData.char}
                          </span>
                        ) : null}
                        {evt && (
                          <div style={styles.eventMarker} title={`Event: ${evt.type}`}>!</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* （イベント詳細は右パネルで表示） */}
          </>
        ) : (
          <div style={styles.emptyMain}>左のパネルからマップを追加・選択してください</div>
        )}
      </div>

      {/* 右: イベント詳細編集パネル */}
      {showEvents && editingEventIdx >= 0 && (currentMap?.events || [])[editingEventIdx] && (
        <div style={styles.eventDetailPanel}>
          <EventDetailEditor
            event={(currentMap.events || [])[editingEventIdx]}
            onChange={(updates) => updateEvent(editingEventIdx, updates)}
            onDelete={() => {
              const newEvents = (currentMap.events || []).filter((_, j) => j !== editingEventIdx);
              updateMap(selectedMapIndex, { events: newEvents });
              setEditingEventIdx(-1);
            }}
            maps={maps}
          />
        </div>
      )}
    </div>
  );
}

// イベント詳細編集サブコンポーネント
function EventDetailEditor({ event, onChange, onDelete, maps }) {
  const es = {
    container: { padding: 16, overflowY: "auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    title: { color: "#C8A870", fontSize: 13, letterSpacing: 1 },
    label: { color: "#888", fontSize: 11, display: "block", marginBottom: 3, marginTop: 10 },
    input: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)", color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" },
    select: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)", color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" },
    textarea: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)", color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 },
    row: { display: "flex", gap: 8 },
    col: { flex: 1 },
    deleteBtn: {
      background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
      color: "#EF5350", padding: "4px 12px", borderRadius: 3, fontSize: 11,
      cursor: "pointer", fontFamily: "inherit",
    },
  };
  const updateData = (field, value) => onChange({ data: { ...event.data, [field]: value } });

  return (
    <div style={es.container}>
      <div style={es.header}>
        <div style={es.title}>イベント編集</div>
        {onDelete && <button onClick={onDelete} style={es.deleteBtn}>削除</button>}
      </div>
      <div style={es.row}>
        <div style={es.col}>
          <label style={es.label}>X</label>
          <input type="number" value={event.x} onChange={(e) => onChange({ x: Number(e.target.value) })} style={es.input} />
        </div>
        <div style={es.col}>
          <label style={es.label}>Y</label>
          <input type="number" value={event.y} onChange={(e) => onChange({ y: Number(e.target.value) })} style={es.input} />
        </div>
      </div>
      <label style={es.label}>種別</label>
      <select value={event.type} onChange={(e) => {
        const type = e.target.value;
        const defaults = { dialog: { speaker: "", text: "" }, warp: { mapIndex: 0, x: 0, y: 0 }, battle: { battleId: "" }, item: { item: "", amount: 1 }, shop: { items: [] }, script: { scriptLabel: "" } };
        onChange({ type, data: defaults[type] || {} });
      }} style={es.select}>
        <option value="dialog">ダイアログ</option>
        <option value="warp">ワープ</option>
        <option value="battle">バトル</option>
        <option value="item">アイテム取得</option>
        <option value="shop">ショップ</option>
        <option value="script">スクリプト呼出</option>
      </select>
      <label style={es.label}>トリガー</label>
      <select value={event.trigger} onChange={(e) => onChange({ trigger: e.target.value })} style={es.select}>
        <option value="action">アクション（決定キー）</option>
        <option value="touch">接触</option>
        <option value="auto">自動</option>
      </select>
      {event.type === "dialog" && (<>
        <label style={es.label}>話者</label>
        <input value={event.data?.speaker || ""} onChange={(e) => updateData("speaker", e.target.value)} style={es.input} />
        <label style={es.label}>テキスト</label>
        <textarea value={event.data?.text || ""} onChange={(e) => updateData("text", e.target.value)} style={es.textarea} rows={5} />
      </>)}
      {event.type === "warp" && (<>
        <label style={es.label}>ワープ先マップ</label>
        <select value={event.data?.mapIndex ?? 0} onChange={(e) => updateData("mapIndex", Number(e.target.value))} style={es.select}>
          {(maps || []).map((m, i) => <option key={i} value={i}>{i}: {m.name}</option>)}
        </select>
        <div style={es.row}>
          <div style={es.col}><label style={es.label}>ワープ先 X</label><input type="number" value={event.data?.x ?? 0} onChange={(e) => updateData("x", Number(e.target.value))} style={es.input} /></div>
          <div style={es.col}><label style={es.label}>ワープ先 Y</label><input type="number" value={event.data?.y ?? 0} onChange={(e) => updateData("y", Number(e.target.value))} style={es.input} /></div>
        </div>
      </>)}
      {event.type === "battle" && (<><label style={es.label}>バトル ID</label><input value={event.data?.battleId || ""} onChange={(e) => updateData("battleId", e.target.value)} style={es.input} /></>)}
      {event.type === "item" && (<>
        <label style={es.label}>アイテム名</label><input value={event.data?.item || ""} onChange={(e) => updateData("item", e.target.value)} style={es.input} />
        <label style={es.label}>個数</label><input type="number" value={event.data?.amount ?? 1} onChange={(e) => updateData("amount", Number(e.target.value))} style={es.input} />
      </>)}
      {event.type === "shop" && (<>
        <label style={es.label}>アイテム一覧（カンマ区切り）</label>
        <input value={(event.data?.items || []).join(", ")} onChange={(e) => updateData("items", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} style={es.input} placeholder="potion, sword, shield" />
      </>)}
      {event.type === "script" && (<><label style={es.label}>スクリプトラベル</label><input value={event.data?.scriptLabel || ""} onChange={(e) => updateData("scriptLabel", e.target.value)} style={es.input} /></>)}
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  sidebar: {
    width: 200, flexShrink: 0, background: "#12121f",
    borderRight: "1px solid rgba(200,180,140,0.1)",
    display: "flex", flexDirection: "column", overflowY: "auto",
  },
  sideSection: { borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 0 4px" },
  sideHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 10px 4px", fontSize: 11, color: "#C8A870", letterSpacing: 1,
  },
  addBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#aaa", width: 22, height: 22, borderRadius: 3, cursor: "pointer", fontSize: 12,
  },
  mapItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 10px", cursor: "pointer", fontSize: 12, transition: "background 0.15s",
  },
  mapName: { color: "#ccc" },
  mapSize: { color: "#555", fontSize: 10, fontFamily: "monospace" },
  emptyMsg: { color: "#555", fontSize: 11, padding: "8px 10px" },
  toolBar: { display: "flex", gap: 3, padding: "0 10px 6px", flexWrap: "wrap" },
  toolBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa", padding: "3px 8px", borderRadius: 3, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  toolBtnActive: { background: "rgba(90,180,255,0.15)", borderColor: "rgba(90,180,255,0.4)", color: "#5BF" },
  layerItem: { padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "monospace" },
  palette: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, padding: "0 10px 8px" },
  paletteTile: {
    width: "100%", aspectRatio: "1", borderRadius: 3, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  paletteChar: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  mapHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 16px", borderBottom: "1px solid rgba(200,180,140,0.1)", flexShrink: 0,
  },
  mapNameInput: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8D4B0", padding: "4px 10px", borderRadius: 3, fontSize: 14, fontFamily: "inherit", outline: "none", width: 200,
  },
  mapControls: { display: "flex", alignItems: "center", gap: 8 },
  sizeLabel: { color: "#888", fontSize: 11, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 },
  sizeInput: {
    width: 48, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#ccc", padding: "3px 6px", borderRadius: 3, fontSize: 11, fontFamily: "monospace", outline: "none",
  },
  randomBtn: {
    background: "rgba(90,180,255,0.1)", border: "1px solid rgba(90,180,255,0.3)",
    color: "#5BF", padding: "3px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  deleteMapBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "3px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  gridContainer: {
    flex: 1, overflow: "auto", padding: 16,
    display: "flex", alignItems: "flex-start", justifyContent: "center",
  },
  eventMarker: {
    position: "absolute", top: 1, right: 1, width: 12, height: 12,
    background: "#FF6F00", borderRadius: "50%", fontSize: 8, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
  },
  // サイドバー内イベントリスト
  eventSideItem: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 10px", cursor: "pointer", fontSize: 11,
    transition: "background 0.15s", borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  eventSidePos: { color: "#5BF", fontFamily: "monospace", fontSize: 10, width: 42, flexShrink: 0 },
  eventSideType: { color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventSideDelBtn: {
    background: "none", border: "none", color: "#EF5350", cursor: "pointer",
    fontSize: 10, flexShrink: 0, opacity: 0.6, padding: "2px 4px",
  },
  // 右パネル: イベント詳細
  eventDetailPanel: {
    width: 280, flexShrink: 0,
    borderLeft: "1px solid rgba(200,180,140,0.1)",
    background: "#12121f",
    overflowY: "auto",
  },
  emptyMain: { color: "#555", fontSize: 14, textAlign: "center", marginTop: 80 },
  // タイル管理パネル
  tileManagerPanel: {
    padding: "12px 16px", borderBottom: "1px solid rgba(200,180,140,0.15)",
    background: "rgba(0,0,0,0.2)", flexShrink: 0,
  },
  tileManagerHeader: { color: "#C8A870", fontSize: 13, letterSpacing: 1, marginBottom: 6 },
  tileManagerHelp: { color: "#666", fontSize: 11, marginBottom: 10 },
  customTileList: { marginBottom: 10 },
  customTileRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
    borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 12,
  },
  customTileThumb: {
    width: 28, height: 28, borderRadius: 3, flexShrink: 0,
    background: "rgba(255,255,255,0.06)", imageRendering: "pixelated",
  },
  customTileId: { color: "#5BF", fontFamily: "monospace", fontSize: 11, width: 80 },
  customTileLabel: { color: "#ccc", flex: 1 },
  customTileDelBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", width: 22, height: 22, borderRadius: 3, fontSize: 12,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  },
  tileAddForm: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  tileAddInput: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "5px 8px", borderRadius: 3, fontSize: 11,
    fontFamily: "inherit", outline: "none", width: 100,
  },
  tileAddBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "5px 12px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  },
};
