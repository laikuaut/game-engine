import { useState, useRef, useCallback, useEffect } from "react";
import { uploadAsset } from "../../project/ProjectStore";
import { COLORS } from "../../data/config";

const GRID_SIZES = [16, 32, 48, 64];

export default function TilesetSplitter({ projectId, customTiles, onUpdateCustomTiles, onClose }) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null); // HTMLImageElement
  const [gridSize, setGridSize] = useState(32);
  const [selectedCells, setSelectedCells] = useState(new Set()); // "col,row" のセット
  const [prefix, setPrefix] = useState("tile");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // "select" or "deselect"

  // 画像読み込み
  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setSelectedCells(new Set());
      // 画像サイズに応じてズーム自動調整
      const maxDim = Math.max(img.width, img.height);
      if (maxDim > 1200) setZoom(Math.max(0.25, 800 / maxDim));
      else if (maxDim < 400) setZoom(2);
      else setZoom(1);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  // グリッド情報
  const cols = image ? Math.floor(image.width / gridSize) : 0;
  const rows = image ? Math.floor(image.height / gridSize) : 0;

  // Canvas 描画
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = image.width * zoom;
    const h = image.height * zoom;
    canvas.width = w;
    canvas.height = h;

    // 画像描画（ピクセルパーフェクト）
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, w, h);

    // グリッド線
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    const cellW = gridSize * zoom;
    const cellH = gridSize * zoom;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, rows * cellH);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(cols * cellW, y * cellH);
      ctx.stroke();
    }

    // 選択セル
    for (const key of selectedCells) {
      const [c, r] = key.split(",").map(Number);
      ctx.fillStyle = "rgba(100,200,255,0.35)";
      ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      ctx.strokeStyle = "rgba(100,200,255,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
    }
  }, [image, gridSize, zoom, selectedCells, cols, rows]);

  // セル座標取得
  const getCellFromEvent = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellW = gridSize * zoom;
    const cellH = gridSize * zoom;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { col, row };
  }, [gridSize, zoom, cols, rows]);

  // クリック/ドラッグで選択
  const handleMouseDown = useCallback((e) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const key = `${cell.col},${cell.row}`;
    setIsDragging(true);
    const isSelected = selectedCells.has(key);
    setDragMode(isSelected ? "deselect" : "select");
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [getCellFromEvent, selectedCells]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragMode) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const key = `${cell.col},${cell.row}`;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (dragMode === "select") next.add(key);
      else next.delete(key);
      return next;
    });
  }, [isDragging, dragMode, getCellFromEvent]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
  }, []);

  // 全選択/全解除
  const selectAll = useCallback(() => {
    const all = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        all.add(`${c},${r}`);
      }
    }
    setSelectedCells(all);
  }, [rows, cols]);

  const deselectAll = useCallback(() => setSelectedCells(new Set()), []);

  // 空タイル判定（完全透明 or 単色のみのタイル除外用）
  const isTileEmpty = useCallback((col, row) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(image, col * gridSize, row * gridSize, gridSize, gridSize, 0, 0, gridSize, gridSize);
    const data = ctx.getImageData(0, 0, gridSize, gridSize).data;
    // 全ピクセルが透明なら空
    let allTransparent = true;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) { allTransparent = false; break; }
    }
    return allTransparent;
  }, [image, gridSize]);

  // 空でないタイルだけ選択
  const selectNonEmpty = useCallback(() => {
    if (!image) return;
    const selected = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isTileEmpty(c, r)) selected.add(`${c},${r}`);
      }
    }
    setSelectedCells(selected);
  }, [image, rows, cols, isTileEmpty]);

  // インポート実行
  const handleImport = useCallback(async () => {
    if (!image || !projectId || selectedCells.size === 0) return;
    setImporting(true);
    const total = selectedCells.size;
    setImportProgress({ current: 0, total });

    const existingIds = new Set([...(customTiles || []).map((t) => t.id)]);
    const newTiles = [];
    let count = 0;

    // 選択セルをソート（左上から右下へ）
    const sorted = [...selectedCells].sort((a, b) => {
      const [ac, ar] = a.split(",").map(Number);
      const [bc, br] = b.split(",").map(Number);
      return ar !== br ? ar - br : ac - bc;
    });

    for (const key of sorted) {
      const [col, row] = key.split(",").map(Number);

      // タイルIDを生成
      let id = `${prefix}_${col}_${row}`;
      let n = 1;
      while (existingIds.has(id)) {
        id = `${prefix}_${col}_${row}_${n++}`;
      }

      // Canvas でタイルを切り出し
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = gridSize;
      tileCanvas.height = gridSize;
      const ctx = tileCanvas.getContext("2d");
      ctx.drawImage(image, col * gridSize, row * gridSize, gridSize, gridSize, 0, 0, gridSize, gridSize);

      // Blob に変換してアップロード
      const blob = await new Promise((resolve) => tileCanvas.toBlob(resolve, "image/png"));
      const filename = `tile_${id}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      try {
        const result = await uploadAsset(projectId, "tile", file);
        if (result.success) {
          const tile = {
            id,
            label: `${prefix} (${col},${row})`,
            color: "#888",
            char: "T",
            image: result.filename,
          };
          newTiles.push(tile);
          existingIds.add(id);
        }
      } catch (err) {
        console.error(`タイル ${id} のアップロード失敗:`, err);
      }
      count++;
      setImportProgress({ current: count, total });
    }

    // カスタムタイルに追加
    if (newTiles.length > 0) {
      const updated = [...(customTiles || []), ...newTiles];
      onUpdateCustomTiles?.(updated);
    }

    setImporting(false);
    setSelectedCells(new Set());
  }, [image, projectId, selectedCells, customTiles, prefix, gridSize, onUpdateCustomTiles]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <span style={styles.title}>タイルセット分割インポート</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* コントロール */}
        <div style={styles.controls}>
          <label style={styles.fileLabel}>
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            <span style={styles.fileLabelBtn}>画像を選択</span>
          </label>

          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>グリッドサイズ:</span>
            {GRID_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => { setGridSize(s); setSelectedCells(new Set()); }}
                style={{ ...styles.gridBtn, ...(gridSize === s ? styles.gridBtnActive : {}) }}
              >
                {s}px
              </button>
            ))}
          </div>

          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>ズーム:</span>
            <input
              type="range" min="0.25" max="4" step="0.25" value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          </div>

          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>接頭辞:</span>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              style={styles.prefixInput}
              placeholder="tile"
            />
          </div>
        </div>

        {/* 選択操作 */}
        {image && (
          <div style={styles.selectionBar}>
            <span style={styles.infoText}>
              {cols}×{rows} = {cols * rows} タイル | 選択中: {selectedCells.size}
            </span>
            <button onClick={selectAll} style={styles.selBtn}>全選択</button>
            <button onClick={selectNonEmpty} style={styles.selBtn}>空以外を選択</button>
            <button onClick={deselectAll} style={styles.selBtn}>全解除</button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCells.size === 0}
              style={{
                ...styles.importBtn,
                opacity: importing || selectedCells.size === 0 ? 0.5 : 1,
              }}
            >
              {importing
                ? `インポート中... (${importProgress.current}/${importProgress.total})`
                : `${selectedCells.size} タイルをインポート`}
            </button>
          </div>
        )}

        {/* キャンバス */}
        <div style={styles.canvasContainer}>
          {!image ? (
            <div style={styles.placeholder}>
              タイルセット画像をドロップまたは選択してください
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: "crosshair", imageRendering: "pixelated" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    width: "90vw",
    height: "90vh",
    background: "#12121f",
    borderRadius: 8,
    border: `1px solid ${COLORS.goldBorder}`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    borderBottom: `1px solid ${COLORS.goldBorderLight}`,
    flexShrink: 0,
  },
  title: {
    color: COLORS.gold,
    fontSize: 16,
    letterSpacing: 2,
  },
  closeBtn: {
    background: "none",
    border: `1px solid rgba(255,255,255,0.2)`,
    color: "#aaa",
    width: 28,
    height: 28,
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "10px 20px",
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
    flexShrink: 0,
    flexWrap: "wrap",
  },
  fileLabel: {
    cursor: "pointer",
  },
  fileLabelBtn: {
    background: "rgba(200,180,140,0.15)",
    border: `1px solid ${COLORS.goldBorder}`,
    color: COLORS.gold,
    padding: "5px 14px",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  controlLabel: {
    color: "#888",
    fontSize: 11,
  },
  gridBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa",
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
  },
  gridBtnActive: {
    background: "rgba(100,200,255,0.15)",
    borderColor: "rgba(100,200,255,0.5)",
    color: "#5BF",
  },
  zoomLabel: {
    color: "#aaa",
    fontSize: 11,
    minWidth: 36,
  },
  prefixInput: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#E8E4DC",
    padding: "3px 8px",
    borderRadius: 3,
    fontSize: 11,
    width: 80,
    outline: "none",
  },
  selectionBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 20px",
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
    flexShrink: 0,
  },
  infoText: {
    color: "#888",
    fontSize: 11,
    marginRight: "auto",
  },
  selBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa",
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
  },
  importBtn: {
    background: "rgba(100,200,100,0.15)",
    border: "1px solid rgba(100,200,100,0.4)",
    color: "#8C4",
    padding: "5px 16px",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
  },
  canvasContainer: {
    flex: 1,
    overflow: "auto",
    padding: 20,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  placeholder: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    width: "100%",
    marginTop: 100,
  },
};
