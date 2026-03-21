import { useState, useRef, useCallback, useEffect } from "react";
import { uploadAsset, getAssetUrl, deleteAsset, listAssets } from "../project/ProjectStore";

// BGM / SE 兼用エディタ
// mode: "bgm" | "se"
export default function AudioCatalogEditor({ catalog, onUpdateCatalog, projectId, mode }) {
  const isBGM = mode === "bgm";
  const label = isBGM ? "BGM" : "SE";
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [assetFiles, setAssetFiles] = useState([]);
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const items = catalog || [];
  const selected = items.find((i) => i.id === selectedId) || null;

  // アセット一覧を取得
  useEffect(() => {
    if (!projectId) return;
    listAssets(projectId, mode).then(setAssetFiles).catch(() => {});
  }, [projectId, mode]);

  const refreshAssets = () => {
    if (projectId) listAssets(projectId, mode).then(setAssetFiles).catch(() => {});
  };

  // 追加
  const addItem = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `${mode}_${Date.now().toString(36)}`;
    const entry = {
      id,
      name,
      filename: null,
      description: "",
      volume: 1.0,
      ...(isBGM ? { loop: true, fadeIn: 500, fadeOut: 500 } : {}),
    };
    onUpdateCatalog([...items, entry]);
    setSelectedId(id);
    setNewName("");
  };

  // 更新
  const updateItem = useCallback((field, value) => {
    if (!selectedId) return;
    const updated = items.map((i) => (i.id === selectedId ? { ...i, [field]: value } : i));
    onUpdateCatalog(updated);
  }, [selectedId, items, onUpdateCatalog]);

  // 削除
  const removeItem = async (id) => {
    const item = items.find((i) => i.id === id);
    if (item?.filename && projectId) {
      await deleteAsset(projectId, mode, item.filename);
      refreshAssets();
    }
    onUpdateCatalog(items.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
    stopPlayback();
  };

  // ファイルアップロード共通処理
  const doUpload = useCallback(async (file) => {
    if (!file || !selectedId || !projectId) return;
    setUploading(true);
    try {
      const result = await uploadAsset(projectId, mode, file);
      if (result.success) {
        updateItem("filename", result.filename);
        refreshAssets();
      }
    } catch (err) {
      console.error(`${label}アップロード失敗:`, err);
    } finally {
      setUploading(false);
    }
  }, [selectedId, projectId, mode, updateItem, label]);

  const handleFileSelect = useCallback((e) => {
    doUpload(e.target.files?.[0]);
    e.target.value = "";
  }, [doUpload]);

  // ドラッグ&ドロップ
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(ogg|mp3|wav)$/i.test(file.name)) {
      doUpload(file);
    }
  }, [doUpload]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // ファイル削除
  const removeFile = async () => {
    if (!selected?.filename || !projectId) return;
    await deleteAsset(projectId, mode, selected.filename);
    updateItem("filename", null);
    refreshAssets();
    stopPlayback();
  };

  // 再生/停止
  const togglePlayback = () => {
    if (!selected?.filename || !projectId) return;
    const url = getAssetUrl(projectId, mode, selected.filename);
    if (playingUrl === url) {
      stopPlayback();
    } else {
      stopPlayback();
      const audio = new Audio(url);
      audio.volume = selected.volume ?? 1.0;
      audio.loop = isBGM && (selected.loop ?? true);
      audio.onended = () => setPlayingUrl(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingUrl(url);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingUrl(null);
  };

  // クリーンアップ
  useEffect(() => () => stopPlayback(), []);

  const isPlaying = selected?.filename && playingUrl === getAssetUrl(projectId, mode, selected.filename);

  return (
    <div style={styles.container}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/ogg,audio/mp3,audio/mpeg,audio/wav,audio/*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* 左: 一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>{label}</div>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => { setSelectedId(item.id); }}
            style={{
              ...styles.listItem,
              background: selectedId === item.id ? "rgba(200,180,140,0.15)" : "transparent",
              borderColor: selectedId === item.id ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
            }}
          >
            <div style={styles.listItemIcon}>{isBGM ? "♪" : "♫"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.listItemName}>{item.name}</div>
              <div style={styles.listItemFile}>
                {item.filename || "ファイル未設定"}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={styles.empty}>{label}がありません</div>
        )}
        <div style={styles.addRow}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`${label}名`}
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <button onClick={addItem} style={styles.addBtn}>追加</button>
        </div>
      </div>

      {/* 右: 編集 */}
      <div style={styles.editor}>
        {selected ? (
          <>
            {/* 基本情報 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>{label}設定</div>
              <label style={styles.label}>名前（スクリプトの name で参照）</label>
              <input
                value={selected.name}
                onChange={(e) => updateItem("name", e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>説明（メモ）</label>
              <input
                value={selected.description || ""}
                onChange={(e) => updateItem("description", e.target.value)}
                style={styles.input}
                placeholder="任意のメモ"
              />
            </div>

            {/* ファイル */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>オーディオファイル</div>
              {selected.filename ? (
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{selected.filename}</div>
                  <div style={styles.fileActions}>
                    <button onClick={togglePlayback} style={styles.playBtn}>
                      {isPlaying ? "■ 停止" : "▶ 再生"}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={styles.uploadBtn}
                    >
                      {uploading ? "..." : "変更"}
                    </button>
                    <button onClick={removeFile} style={styles.removeBtn}>削除</button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ ...styles.uploadArea, ...(dragOver ? styles.uploadAreaDragOver : {}) }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={styles.uploadBtnLarge}
                  >
                    {uploading ? "アップロード中..." : `${label}ファイルをアップロード`}
                  </button>
                  <div style={styles.uploadHint}>
                    OGG, MP3, WAV に対応 — ドラッグ&ドロップも可
                  </div>
                </div>
              )}
            </div>

            {/* パラメータ */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>パラメータ</div>
              <label style={styles.label}>音量 ({Math.round((selected.volume ?? 1.0) * 100)}%)</label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={selected.volume ?? 1.0}
                onChange={(e) => updateItem("volume", Number(e.target.value))}
                style={styles.range}
              />
              {isBGM && (
                <>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selected.loop ?? true}
                      onChange={(e) => updateItem("loop", e.target.checked)}
                    />
                    <span>ループ再生</span>
                  </label>
                  <label style={styles.label}>フェードイン (ms)</label>
                  <input
                    type="number" min="0" step="100"
                    value={selected.fadeIn ?? 500}
                    onChange={(e) => updateItem("fadeIn", Number(e.target.value))}
                    style={styles.inputSmall}
                  />
                  <label style={styles.label}>フェードアウト (ms)</label>
                  <input
                    type="number" min="0" step="100"
                    value={selected.fadeOut ?? 500}
                    onChange={(e) => updateItem("fadeOut", Number(e.target.value))}
                    style={styles.inputSmall}
                  />
                </>
              )}
            </div>

            {/* スクリプトでの使い方 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>スクリプトでの使い方</div>
              <pre style={styles.codeBlock}>
                {isBGM
                  ? `{ type: "bgm", name: "${selected.name}" }`
                  : `{ type: "se", name: "${selected.name}" }`}
              </pre>
            </div>

            <button onClick={() => removeItem(selected.id)} style={styles.deleteBtn}>
              この{label}を削除
            </button>
          </>
        ) : (
          <div style={styles.empty}>
            左のリストから{label}を選択、または新規追加してください
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex", height: "100%", overflow: "hidden",
  },
  list: {
    width: 240, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
    overflowY: "auto", padding: 12,
  },
  listHeader: {
    color: "#C8A870", fontSize: 13, letterSpacing: 2, marginBottom: 12,
    borderBottom: "1px solid rgba(200,180,140,0.2)", paddingBottom: 6,
  },
  listItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 4, marginBottom: 4, cursor: "pointer",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)",
    transition: "all 0.2s",
  },
  listItemIcon: {
    fontSize: 16, width: 28, height: 28, borderRadius: 4,
    background: "rgba(200,180,140,0.1)", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
    color: "#C8A870",
  },
  listItemName: { color: "#E8D4B0", fontSize: 13 },
  listItemFile: {
    color: "#555", fontSize: 10, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  editor: {
    flex: 1, overflowY: "auto", padding: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: "#C8A870", fontSize: 13, letterSpacing: 1, marginBottom: 10,
    borderBottom: "1px solid rgba(200,180,140,0.15)", paddingBottom: 4,
  },
  label: {
    color: "#888", fontSize: 11, display: "block", marginBottom: 4, marginTop: 8,
  },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  },
  inputSmall: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: 120, boxSizing: "border-box",
  },
  range: {
    width: "100%", accentColor: "#C8A870",
  },
  checkboxLabel: {
    color: "#ccc", fontSize: 12, display: "flex", alignItems: "center",
    gap: 6, marginTop: 10, cursor: "pointer",
  },
  fileInfo: {
    padding: 12, background: "rgba(255,255,255,0.03)",
    borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
  },
  fileName: {
    color: "#aaa", fontSize: 12, fontFamily: "monospace", marginBottom: 8,
  },
  fileActions: {
    display: "flex", gap: 8,
  },
  playBtn: {
    background: "rgba(100,200,100,0.1)", border: "1px solid rgba(100,200,100,0.3)",
    color: "#8C4", padding: "5px 14px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  uploadBtn: {
    background: "rgba(200,180,140,0.1)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "5px 14px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  removeBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "5px 14px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  uploadArea: {
    padding: 24, textAlign: "center",
    background: "rgba(255,255,255,0.02)",
    border: "2px dashed rgba(200,180,140,0.2)",
    borderRadius: 8,
  },
  uploadAreaDragOver: {
    borderColor: "rgba(100,200,255,0.6)",
    background: "rgba(100,200,255,0.05)",
  },
  uploadBtnLarge: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "10px 24px", borderRadius: 4, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
  },
  uploadHint: {
    color: "#555", fontSize: 11, marginTop: 8,
  },
  codeBlock: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#aaa", padding: "8px 12px", borderRadius: 4, fontSize: 11,
    fontFamily: "monospace", overflow: "auto",
  },
  addRow: {
    display: "flex", gap: 6, marginTop: 12,
  },
  addBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "6px 12px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "8px 16px", borderRadius: 3,
    fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 20, width: "100%",
  },
  empty: {
    color: "#555", fontSize: 13, textAlign: "center", marginTop: 40,
  },
};
