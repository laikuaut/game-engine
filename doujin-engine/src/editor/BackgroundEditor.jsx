import { useState, useRef, useCallback, useEffect } from "react";
import { uploadAsset, getAssetUrl, deleteAsset, listAssets } from "../project/ProjectStore";

// 背景画像の登録・管理エディタ
export default function BackgroundEditor({ bgStyles, onUpdateBgStyles, projectId }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [assetFiles, setAssetFiles] = useState([]);
  const fileInputRef = useRef(null);

  const bgEntries = Object.entries(bgStyles || {});
  const selected = selectedKey ? bgStyles[selectedKey] : null;

  // アセット一覧を取得
  useEffect(() => {
    if (!projectId) return;
    listAssets(projectId, "bg").then(setAssetFiles).catch(() => {});
  }, [projectId]);

  // 背景追加（グラデーション）
  const addBackground = () => {
    const key = newKey.trim();
    if (!key || bgStyles[key]) return;
    onUpdateBgStyles({
      ...bgStyles,
      [key]: { background: "linear-gradient(180deg, #4A90D9 0%, #87CEEB 50%, #B0C4DE 100%)" },
    });
    setSelectedKey(key);
    setNewKey("");
  };

  // 背景削除
  const removeBackground = async (key) => {
    const style = bgStyles[key];
    // 関連画像ファイルも削除
    if (style?.imageFile && projectId) {
      await deleteAsset(projectId, "bg", style.imageFile);
      refreshAssetList();
    }
    const updated = { ...bgStyles };
    delete updated[key];
    onUpdateBgStyles(updated);
    if (selectedKey === key) setSelectedKey(null);
  };

  // 背景キー変更
  const renameBackground = (oldKey, newKeyVal) => {
    if (!newKeyVal.trim() || newKeyVal === oldKey || bgStyles[newKeyVal]) return;
    const updated = {};
    Object.entries(bgStyles).forEach(([k, v]) => {
      updated[k === oldKey ? newKeyVal : k] = v;
    });
    onUpdateBgStyles(updated);
    setSelectedKey(newKeyVal);
  };

  // グラデーション値を更新
  const updateGradient = (value) => {
    if (!selectedKey) return;
    onUpdateBgStyles({
      ...bgStyles,
      [selectedKey]: { ...bgStyles[selectedKey], background: value, imageFile: undefined },
    });
  };

  // 画像アップロード
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedKey || !projectId) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const uploadName = `bg_${selectedKey}.${ext}`;
      const renamedFile = new File([file], uploadName, { type: file.type });
      const result = await uploadAsset(projectId, "bg", renamedFile);
      if (result.success) {
        const url = getAssetUrl(projectId, "bg", result.filename);
        onUpdateBgStyles({
          ...bgStyles,
          [selectedKey]: {
            ...bgStyles[selectedKey],
            background: `url(${url}) center/cover no-repeat`,
            imageFile: result.filename,
          },
        });
        refreshAssetList();
      }
    } catch (err) {
      console.error("背景画像アップロード失敗:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [selectedKey, projectId, bgStyles, onUpdateBgStyles]);

  // 画像を削除してグラデーションに戻す
  const removeImage = async () => {
    if (!selectedKey || !selected?.imageFile) return;
    if (projectId) {
      await deleteAsset(projectId, "bg", selected.imageFile);
      refreshAssetList();
    }
    onUpdateBgStyles({
      ...bgStyles,
      [selectedKey]: {
        background: "linear-gradient(180deg, #4A90D9 0%, #87CEEB 50%, #B0C4DE 100%)",
        imageFile: undefined,
      },
    });
  };

  const refreshAssetList = () => {
    if (projectId) listAssets(projectId, "bg").then(setAssetFiles).catch(() => {});
  };

  // プレビュースタイルを取得
  const getPreviewStyle = (style) => {
    if (!style) return {};
    return { background: style.background || "#333" };
  };

  return (
    <div style={styles.container}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* 左: 背景一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>背景</div>
        {bgEntries.map(([key, style]) => (
          <div
            key={key}
            onClick={() => setSelectedKey(key)}
            style={{
              ...styles.listItem,
              background: selectedKey === key ? "rgba(200,180,140,0.15)" : "transparent",
              borderColor: selectedKey === key ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                ...styles.listThumb,
                ...getPreviewStyle(style),
              }}
            />
            <div>
              <div style={styles.listItemName}>{key}</div>
              <div style={styles.listItemType}>
                {style.imageFile ? "画像" : "グラデーション"}
              </div>
            </div>
          </div>
        ))}
        {bgEntries.length === 0 && (
          <div style={styles.empty}>背景がありません</div>
        )}
        <div style={styles.addRow}>
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="背景キー名"
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && addBackground()}
          />
          <button onClick={addBackground} style={styles.addBtn}>追加</button>
        </div>
      </div>

      {/* 右: 編集パネル */}
      <div style={styles.editor}>
        {selected ? (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>背景設定</div>
              <label style={styles.label}>キー名（scriptの bg.src で使用）</label>
              <input
                value={selectedKey}
                onChange={(e) => renameBackground(selectedKey, e.target.value)}
                style={styles.input}
              />
            </div>

            {/* プレビュー */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>プレビュー</div>
              <div style={{
                ...styles.previewBox,
                ...getPreviewStyle(selected),
              }}>
                <div style={styles.previewLabel}>BG: {selectedKey}</div>
              </div>
            </div>

            {/* 画像設定 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>背景画像</div>
              {selected.imageFile ? (
                <div style={styles.imageInfo}>
                  <div style={styles.imageFileName}>{selected.imageFile}</div>
                  <div style={styles.imageActions}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={styles.uploadBtn}
                    >
                      {uploading ? "アップロード中..." : "画像を変更"}
                    </button>
                    <button onClick={removeImage} style={styles.removeImageBtn}>
                      画像を削除
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.imageUploadArea}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={styles.uploadBtnLarge}
                  >
                    {uploading ? "アップロード中..." : "背景画像をアップロード"}
                  </button>
                  <div style={styles.uploadHint}>
                    PNG, JPEG, WebP に対応。推奨: 1920×1080px
                  </div>
                </div>
              )}
            </div>

            {/* グラデーション手動設定 */}
            {!selected.imageFile && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>グラデーション（手動）</div>
                <label style={styles.label}>CSS background 値</label>
                <input
                  value={selected.background || ""}
                  onChange={(e) => updateGradient(e.target.value)}
                  style={styles.input}
                  placeholder="linear-gradient(180deg, #xxx, #yyy)"
                />
              </div>
            )}

            <button onClick={() => removeBackground(selectedKey)} style={styles.deleteBtn}>
              この背景を削除
            </button>
          </>
        ) : (
          <div style={styles.empty}>
            左のリストから背景を選択、または新規追加してください
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
    width: 220, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
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
  listThumb: {
    width: 40, height: 24, borderRadius: 3, flexShrink: 0,
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundSize: "cover", backgroundPosition: "center",
  },
  listItemName: { color: "#E8D4B0", fontSize: 13 },
  listItemType: { color: "#666", fontSize: 10 },
  editor: {
    flex: 1, overflowY: "auto", padding: 20,
  },
  section: {
    marginBottom: 20,
  },
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
  previewBox: {
    width: "100%", aspectRatio: "16/9", borderRadius: 6,
    border: "1px solid rgba(200,180,140,0.15)",
    position: "relative", overflow: "hidden",
    backgroundSize: "cover", backgroundPosition: "center",
  },
  previewLabel: {
    position: "absolute", bottom: 8, left: 12,
    fontSize: 11, color: "rgba(255,255,255,0.4)",
    fontFamily: "monospace",
  },
  imageInfo: {
    padding: 12, background: "rgba(255,255,255,0.03)",
    borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
  },
  imageFileName: {
    color: "#aaa", fontSize: 12, fontFamily: "monospace", marginBottom: 8,
  },
  imageActions: {
    display: "flex", gap: 8,
  },
  imageUploadArea: {
    padding: 24, textAlign: "center",
    background: "rgba(255,255,255,0.02)",
    border: "2px dashed rgba(200,180,140,0.2)",
    borderRadius: 8,
  },
  uploadBtn: {
    background: "rgba(200,180,140,0.1)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "5px 14px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  uploadBtnLarge: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "10px 24px", borderRadius: 4, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
  },
  uploadHint: {
    color: "#555", fontSize: 11, marginTop: 8,
  },
  removeImageBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "5px 14px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
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
