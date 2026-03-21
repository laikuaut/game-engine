import { useState, useCallback, useMemo } from "react";

// タイルパレット定義
const TILE_TYPES = [
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

const TILE_MAP = Object.fromEntries(TILE_TYPES.map((t) => [t.id, t]));

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

// 空タイルグリッド生成
function createEmptyGrid(w, h, fill = "grass") {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

export default function MapEditor({ maps: initialMaps, onUpdateMaps }) {
  const [maps, setMaps] = useState(initialMaps || []);
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useState("grass");
  const [activeLayer, setActiveLayer] = useState(0);
  const [tool, setTool] = useState("paint"); // paint | fill | eraser
  const [isPainting, setIsPainting] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  const currentMap = maps[selectedMapIndex] || null;

  // マップ更新
  const updateMap = useCallback((index, updates) => {
    setMaps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      onUpdateMaps?.(next);
      return next;
    });
  }, [onUpdateMaps]);

  // 新規マップ追加
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

  // マップ削除
  const removeMap = useCallback((index) => {
    if (maps.length <= 1) return;
    const next = maps.filter((_, i) => i !== index);
    setMaps(next);
    setSelectedMapIndex(Math.max(0, selectedMapIndex - 1));
    onUpdateMaps?.(next);
  }, [maps, selectedMapIndex, onUpdateMaps]);

  // タイル配置
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

  // イベント追加
  const addEvent = useCallback((row, col) => {
    if (!currentMap) return;
    const newEvent = {
      id: Date.now().toString(36),
      x: col,
      y: row,
      type: "dialog",
      trigger: "action",
      data: { speaker: "", text: "イベントテキスト" },
    };
    updateMap(selectedMapIndex, {
      events: [...(currentMap.events || []), newEvent],
    });
  }, [currentMap, selectedMapIndex, updateMap]);

  // マップリサイズ
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

  return (
    <div style={styles.container}>
      {/* 左: マップ一覧 + タイルパレット */}
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
          {maps.length === 0 && (
            <div style={styles.emptyMsg}>マップを追加してください</div>
          )}
        </div>

        {/* ツール */}
        <div style={styles.sideSection}>
          <div style={styles.sideHeader}>ツール</div>
          <div style={styles.toolBar}>
            {[
              { id: "paint", label: "ペン" },
              { id: "eraser", label: "消しゴム" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                style={{
                  ...styles.toolBtn,
                  ...(tool === t.id ? styles.toolBtnActive : {}),
                }}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setShowEvents(!showEvents)}
              style={{
                ...styles.toolBtn,
                ...(showEvents ? styles.toolBtnActive : {}),
              }}
            >
              イベント
            </button>
          </div>
        </div>

        {/* レイヤー */}
        {currentMap && (
          <div style={styles.sideSection}>
            <div style={styles.sideHeader}>レイヤー</div>
            {currentMap.layers.map((layer, i) => (
              <div
                key={i}
                onClick={() => setActiveLayer(i)}
                style={{
                  ...styles.layerItem,
                  background: i === activeLayer ? "rgba(90,180,255,0.12)" : "transparent",
                  color: i === activeLayer ? "#5BF" : "#888",
                }}
              >
                {layer.name}
              </div>
            ))}
          </div>
        )}

        {/* タイルパレット */}
        <div style={{ ...styles.sideSection, flex: 1, overflowY: "auto" }}>
          <div style={styles.sideHeader}>タイル</div>
          <div style={styles.palette}>
            {TILE_TYPES.map((tile) => (
              <div
                key={tile.id}
                onClick={() => { setSelectedTile(tile.id); setTool("paint"); }}
                title={tile.label}
                style={{
                  ...styles.paletteTile,
                  background: tile.color,
                  outline: selectedTile === tile.id ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={styles.paletteChar}>{tile.char}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 中央: マップグリッド */}
      <div style={styles.main}>
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
                <button onClick={() => removeMap(selectedMapIndex)} style={styles.deleteMapBtn}>
                  削除
                </button>
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
                    // 全レイヤーを重ねて表示（上のレイヤーが優先）
                    let tileId = null;
                    for (let l = currentMap.layers.length - 1; l >= 0; l--) {
                      const t = currentMap.layers[l]?.tiles?.[row]?.[col];
                      if (t) { tileId = t; break; }
                    }
                    const tileData = tileId ? TILE_MAP[tileId] : null;
                    // イベント表示
                    const evt = showEvents && (currentMap.events || []).find((e) => e.x === col && e.y === row);

                    return (
                      <div
                        key={`${row}-${col}`}
                        onMouseDown={() => { setIsPainting(true); paintTile(row, col); }}
                        onMouseEnter={() => { if (isPainting) paintTile(row, col); }}
                        onMouseUp={() => setIsPainting(false)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (showEvents) addEvent(row, col);
                        }}
                        style={{
                          width: currentMap.tileSize,
                          height: currentMap.tileSize,
                          background: tileData ? tileData.color : "rgba(0,0,0,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "crosshair",
                          position: "relative",
                          userSelect: "none",
                        }}
                      >
                        {tileData && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                            {tileData.char}
                          </span>
                        )}
                        {evt && (
                          <div style={styles.eventMarker} title={`Event: ${evt.type}`}>
                            !
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* イベントリスト */}
            {showEvents && (
              <div style={styles.eventList}>
                <div style={styles.eventListHeader}>
                  イベント ({(currentMap.events || []).length})
                  <span style={styles.eventHint}>※ 右クリックでマップにイベント追加</span>
                </div>
                {(currentMap.events || []).map((evt, i) => (
                  <div key={evt.id || i} style={styles.eventRow}>
                    <span style={styles.eventPos}>({evt.x},{evt.y})</span>
                    <span style={styles.eventType}>{evt.type}</span>
                    <span style={styles.eventTrigger}>{evt.trigger}</span>
                    <button
                      onClick={() => {
                        const newEvents = (currentMap.events || []).filter((_, j) => j !== i);
                        updateMap(selectedMapIndex, { events: newEvents });
                      }}
                      style={styles.eventDelBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={styles.emptyMain}>
            左のパネルからマップを追加・選択してください
          </div>
        )}
      </div>
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
  sideSection: {
    borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 0 4px",
  },
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
    color: "#aaa", padding: "3px 8px", borderRadius: 3, fontSize: 10, cursor: "pointer",
    fontFamily: "inherit",
  },
  toolBtnActive: {
    background: "rgba(90,180,255,0.15)", borderColor: "rgba(90,180,255,0.4)", color: "#5BF",
  },
  layerItem: {
    padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "monospace",
  },
  palette: {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, padding: "0 10px 8px",
  },
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
    color: "#E8D4B0", padding: "4px 10px", borderRadius: 3, fontSize: 14,
    fontFamily: "inherit", outline: "none", width: 200,
  },
  mapControls: { display: "flex", alignItems: "center", gap: 8 },
  sizeLabel: { color: "#888", fontSize: 11, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 },
  sizeInput: {
    width: 48, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#ccc", padding: "3px 6px", borderRadius: 3, fontSize: 11, fontFamily: "monospace", outline: "none",
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
  eventList: {
    flexShrink: 0, borderTop: "1px solid rgba(200,180,140,0.1)",
    maxHeight: 120, overflowY: "auto", padding: "6px 16px",
  },
  eventListHeader: {
    fontSize: 11, color: "#C8A870", marginBottom: 4, display: "flex", alignItems: "center", gap: 8,
  },
  eventHint: { fontSize: 9, color: "#555" },
  eventRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "2px 0",
    fontSize: 11, borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  eventPos: { color: "#5BF", fontFamily: "monospace", width: 50 },
  eventType: { color: "#ccc" },
  eventTrigger: { color: "#666", fontSize: 10 },
  eventDelBtn: {
    background: "none", border: "none", color: "#EF5350", cursor: "pointer",
    fontSize: 10, marginLeft: "auto",
  },
  emptyMain: { color: "#555", fontSize: 14, textAlign: "center", marginTop: 80 },
};
