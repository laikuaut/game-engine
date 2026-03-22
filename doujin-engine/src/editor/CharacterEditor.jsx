import { useState, useRef, useCallback } from "react";
import { uploadAsset, getAssetUrl, deleteAsset, listAssets } from "../project/ProjectStore";

// キャラクター定義エディタ
export default function CharacterEditor({ characters, onUpdateCharacters, projectId }) {
  const [selectedId, setSelectedId] = useState(null);
  const [newId, setNewId] = useState("");
  const [newExprKey, setNewExprKey] = useState("");
  const [newExprVal, setNewExprVal] = useState("");
  const [uploading, setUploading] = useState(null);
  const [previewExpr, setPreviewExpr] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const charEntries = Object.entries(characters || {});
  const selected = selectedId ? characters[selectedId] : null;

  // キャラ追加
  const addCharacter = () => {
    const id = newId.trim() || `chara_${Date.now().toString(36)}`;
    const updated = {
      ...characters,
      [id]: {
        name: id,
        color: "#88AACC",
        expressions: { neutral: "🙂", smile: "😊", sad: "😢" },
      },
    };
    onUpdateCharacters(updated);
    setSelectedId(id);
    setNewId("");
  };

  // キャラ複製
  const duplicateCharacter = (id) => {
    const src = characters[id];
    if (!src) return;
    const newCharId = `${id}_copy_${Date.now().toString(36).slice(-4)}`;
    const updated = {
      ...characters,
      [newCharId]: JSON.parse(JSON.stringify({ ...src, name: `${src.name}(コピー)` })),
    };
    onUpdateCharacters(updated);
    setSelectedId(newCharId);
  };

  // キャラ削除
  const removeCharacter = (id) => {
    const updated = { ...characters };
    delete updated[id];
    onUpdateCharacters(updated);
    if (selectedId === id) setSelectedId(null);
  };

  // フィールド更新
  const updateField = (field, value) => {
    if (!selectedId) return;
    onUpdateCharacters({
      ...characters,
      [selectedId]: { ...characters[selectedId], [field]: value },
    });
  };

  // 表情追加
  const addExpression = () => {
    if (!selectedId || !newExprKey.trim()) return;
    const exprs = { ...characters[selectedId].expressions, [newExprKey.trim()]: newExprVal || "🙂" };
    updateField("expressions", exprs);
    setNewExprKey("");
    setNewExprVal("");
  };

  // 表情削除
  const removeExpression = (key) => {
    if (!selectedId) return;
    const exprs = { ...characters[selectedId].expressions };
    delete exprs[key];
    updateField("expressions", exprs);
    // スプライトも削除
    if (selected.sprites?.[key]) {
      const sprites = { ...selected.sprites };
      delete sprites[key];
      updateField("sprites", Object.keys(sprites).length > 0 ? sprites : undefined);
    }
  };

  // 表情の値を更新
  const updateExpression = (key, value) => {
    if (!selectedId) return;
    const exprs = { ...characters[selectedId].expressions, [key]: value };
    updateField("expressions", exprs);
  };

  // キャラ ID 変更
  const renameCharacter = (oldId, newIdVal) => {
    if (!newIdVal.trim() || newIdVal === oldId || characters[newIdVal]) return;
    const updated = {};
    Object.entries(characters).forEach(([k, v]) => {
      updated[k === oldId ? newIdVal : k] = v;
    });
    onUpdateCharacters(updated);
    setSelectedId(newIdVal);
  };

  // 画像アップロード（共通処理）
  const uploadSpriteFile = useCallback(async (file, exprKey) => {
    if (!file || !selectedId || !projectId) return;
    setUploading(exprKey);
    try {
      const ext = file.name.split(".").pop();
      const uploadName = `${selectedId}_${exprKey}.${ext}`;
      const renamedFile = new File([file], uploadName, { type: file.type });
      const result = await uploadAsset(projectId, "chara", renamedFile);
      if (result.success) {
        const sprites = { ...(selected.sprites || {}), [exprKey]: result.filename };
        updateField("sprites", sprites);
      }
    } catch (err) {
      console.error("アップロード失敗:", err);
    } finally {
      setUploading(null);
    }
  }, [selectedId, projectId, selected, updateField]);

  // ボタンクリックでアップロード
  const startUpload = (exprKey) => {
    setUploadTarget({ exprKey });
    fileInputRef.current?.click();
  };

  // ファイル選択時のハンドラ
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    await uploadSpriteFile(file, uploadTarget.exprKey);
    setUploadTarget(null);
    e.target.value = "";
  }, [uploadTarget, uploadSpriteFile]);

  // ドラッグ&ドロップハンドラ
  const handleDrop = useCallback((e, exprKey) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file && /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name)) {
      uploadSpriteFile(file, exprKey);
    }
  }, [uploadSpriteFile]);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  // スプライト画像を削除
  const removeSpriteImage = async (exprKey) => {
    if (!selectedId || !selected.sprites?.[exprKey]) return;
    const filename = selected.sprites[exprKey];
    if (projectId) {
      await deleteAsset(projectId, "chara", filename);
    }
    const sprites = { ...selected.sprites };
    delete sprites[exprKey];
    updateField("sprites", Object.keys(sprites).length > 0 ? sprites : undefined);
  };

  // スプライトのサムネURL
  const getSpriteUrl = (filename) => {
    if (!projectId || !filename) return null;
    return getAssetUrl(projectId, "chara", filename);
  };

  // 左パネルのサムネイル表示
  const renderListThumb = (data) => {
    const firstSprite = data.sprites ? Object.values(data.sprites)[0] : null;
    if (firstSprite && projectId) {
      return (
        <img
          src={getAssetUrl(projectId, "chara", firstSprite)}
          alt=""
          style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      );
    }
    return (
      <span style={{ fontSize: 20, marginRight: 8 }}>
        {Object.values(data.expressions || {})[0] || "🙂"}
      </span>
    );
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

      {/* 左: キャラ一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>キャラクター</div>
        {charEntries.map(([id, data]) => (
          <div
            key={id}
            onClick={() => setSelectedId(id)}
            style={{
              ...styles.listItem,
              background: selectedId === id ? "rgba(200,180,140,0.15)" : "transparent",
              borderColor: selectedId === id ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
            }}
          >
            {renderListThumb(data)}
            <div>
              <div style={styles.listItemName}>{data.name || id}</div>
              <div style={styles.listItemId}>{id}</div>
            </div>
            <div
              style={{
                width: 16, height: 16, borderRadius: "50%",
                background: data.color || "#888", marginLeft: "auto", flexShrink: 0,
              }}
            />
          </div>
        ))}
        {charEntries.length === 0 && (
          <div style={styles.empty}>キャラクターがいません</div>
        )}
        <div style={styles.addRow}>
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="キャラID"
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && addCharacter()}
          />
          <button onClick={addCharacter} style={styles.addBtn}>追加</button>
        </div>
      </div>

      {/* 右: 編集パネル */}
      <div style={styles.editor}>
        {selected ? (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>基本情報</div>
              <label style={styles.label}>キャラ ID</label>
              <input
                value={selectedId}
                onChange={(e) => renameCharacter(selectedId, e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>表示名</label>
              <input
                value={selected.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>テーマカラー</label>
              <div style={styles.colorRow}>
                <input
                  type="color"
                  value={selected.color || "#88AACC"}
                  onChange={(e) => updateField("color", e.target.value)}
                  style={styles.colorPicker}
                />
                <input
                  value={selected.color || ""}
                  onChange={(e) => updateField("color", e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="#RRGGBB"
                />
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Live2D（任意）</div>
              <label style={styles.label}>モデルファイル</label>
              <input
                value={selected.live2dModel || ""}
                onChange={(e) => updateField("live2dModel", e.target.value || undefined)}
                style={styles.input}
                placeholder="model/character.model3.json"
              />
              <label style={styles.label}>スケール</label>
              <input
                type="number"
                step="0.05"
                value={selected.live2dScale || 0.25}
                onChange={(e) => updateField("live2dScale", Number(e.target.value))}
                style={styles.input}
              />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>表情一覧・立ち絵</div>
              <div style={styles.exprHelp}>
                各表情に立ち絵画像を設定できます。画像がない場合は絵文字で表示されます。
              </div>
              {Object.entries(selected.expressions || {}).map(([key, val]) => {
                const spriteFile = selected.sprites?.[key];
                const spriteUrl = getSpriteUrl(spriteFile);
                return (
                  <div
                    key={key}
                    style={styles.exprCard}
                    onDrop={(e) => handleDrop(e, key)}
                    onDragOver={handleDragOver}
                  >
                    <div style={styles.exprCardHeader}>
                      <span style={styles.exprKey}>{key}</span>
                      <input
                        value={val}
                        onChange={(e) => updateExpression(key, e.target.value)}
                        style={{ ...styles.input, width: 60, textAlign: "center" }}
                      />
                      <span style={{ fontSize: 20 }}>{val}</span>
                      <button onClick={() => removeExpression(key)} style={styles.removeBtn}>×</button>
                    </div>
                    {/* 立ち絵画像 */}
                    <div style={styles.spriteRow}>
                      {spriteUrl ? (
                        <div style={styles.spritePreviewWrap}>
                          <img
                            src={spriteUrl}
                            alt={`${key} sprite`}
                            style={styles.spritePreview}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                          <button
                            onClick={() => removeSpriteImage(key)}
                            style={styles.spriteRemoveBtn}
                            title="画像を削除"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div style={styles.dropZone}>D&D or クリック</div>
                      )}
                      <button
                        onClick={() => startUpload(key)}
                        disabled={uploading === key}
                        style={styles.uploadBtn}
                      >
                        {uploading === key ? "..." : spriteUrl ? "変更" : "設定"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <div style={styles.exprRow}>
                <input
                  value={newExprKey}
                  onChange={(e) => setNewExprKey(e.target.value)}
                  placeholder="表情名"
                  style={{ ...styles.input, flex: 1 }}
                  onKeyDown={(e) => e.key === "Enter" && addExpression()}
                />
                <input
                  value={newExprVal}
                  onChange={(e) => setNewExprVal(e.target.value)}
                  placeholder="絵文字"
                  style={{ ...styles.input, width: 60, textAlign: "center" }}
                  onKeyDown={(e) => e.key === "Enter" && addExpression()}
                />
                <button onClick={addExpression} style={styles.addBtn}>追加</button>
              </div>
            </div>

            {/* プレビュー */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>プレビュー</div>
              {/* 表情切替ボタン */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {Object.keys(selected.expressions || {}).map((key) => {
                  const hasSprite = !!selected.sprites?.[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setPreviewExpr(key)}
                      style={{
                        ...styles.previewExprBtn,
                        ...(previewExpr === key ? styles.previewExprBtnActive : {}),
                        opacity: hasSprite ? 1 : 0.5,
                      }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
              {/* 大きなプレビュー画像 */}
              <div style={styles.largePreview}>
                {(() => {
                  const expr = previewExpr || Object.keys(selected.expressions || {})[0];
                  const spriteFile = selected.sprites?.[expr];
                  const spriteUrl = getSpriteUrl(spriteFile);
                  if (spriteUrl) {
                    return (
                      <img src={spriteUrl} alt={`${selected.name} ${expr}`} style={styles.largePreviewImg}
                        onError={(e) => { e.target.style.display = "none"; }} />
                    );
                  }
                  return (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexDirection: "column", height: "100%",
                    }}>
                      <span style={{ fontSize: 64 }}>
                        {selected.expressions?.[expr] || "🙂"}
                      </span>
                      <span style={{ fontSize: 12, color: "#888", marginTop: 8 }}>{expr || "—"}</span>
                    </div>
                  );
                })()}
                <div style={styles.largePreviewLabel}>
                  <span style={{ background: selected.color + "44", padding: "2px 10px", borderRadius: 8 }}>
                    {selected.name}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => duplicateCharacter(selectedId)} style={styles.actionBtn}>
                複製
              </button>
              <button onClick={() => removeCharacter(selectedId)} style={styles.deleteBtn}>
                削除
              </button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            左のリストからキャラクターを選択、または新規追加してください
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
  listItemName: { color: "#E8D4B0", fontSize: 13 },
  listItemId: { color: "#666", fontSize: 10, fontFamily: "monospace" },
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
  colorRow: {
    display: "flex", gap: 8, alignItems: "center",
  },
  colorPicker: {
    width: 36, height: 36, border: "none", borderRadius: 4,
    cursor: "pointer", background: "none", padding: 0,
  },
  exprRow: {
    display: "flex", gap: 8, alignItems: "center", marginBottom: 6,
  },
  exprKey: {
    color: "#aaa", fontSize: 12, fontFamily: "monospace", width: 80, flexShrink: 0,
  },
  exprCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6, padding: 10, marginBottom: 8,
  },
  exprCardHeader: {
    display: "flex", gap: 8, alignItems: "center", marginBottom: 8,
  },
  exprHelp: {
    color: "#666", fontSize: 11, marginBottom: 12,
  },
  spriteRow: {
    display: "flex", gap: 10, alignItems: "center",
  },
  spritePreviewWrap: {
    position: "relative", flexShrink: 0,
  },
  spritePreview: {
    width: 64, height: 80, objectFit: "cover", borderRadius: 4,
    border: "1px solid rgba(200,180,140,0.2)",
  },
  spriteRemoveBtn: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: "50%",
    background: "rgba(239,83,80,0.9)", border: "none",
    color: "#fff", fontSize: 11, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, lineHeight: 1,
  },
  dropZone: {
    width: 64, height: 80, borderRadius: 4,
    border: "2px dashed rgba(200,180,140,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#888", fontSize: 9, flexShrink: 0, textAlign: "center",
    cursor: "pointer",
  },
  spriteEmpty: {
    width: 64, height: 80, borderRadius: 4,
    border: "1px dashed rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#555", fontSize: 10, flexShrink: 0,
  },
  uploadBtn: {
    background: "rgba(200,180,140,0.1)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "5px 12px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  },
  addRow: {
    display: "flex", gap: 6, marginTop: 12,
  },
  addBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "6px 12px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  removeBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", width: 24, height: 24, borderRadius: 3, fontSize: 14,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0,
  },
  actionBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "8px 16px", borderRadius: 3,
    fontSize: 12, cursor: "pointer", fontFamily: "inherit", flex: 1,
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "8px 16px", borderRadius: 3,
    fontSize: 12, cursor: "pointer", fontFamily: "inherit", flex: 1,
  },
  preview: {
    display: "flex", justifyContent: "center", padding: 16,
    background: "rgba(0,0,0,0.3)", borderRadius: 6,
  },
  previewExprBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa", padding: "2px 8px", borderRadius: 3,
    fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  previewExprBtnActive: {
    background: "rgba(200,180,140,0.2)", borderColor: "rgba(200,180,140,0.4)",
    color: "#E8D4B0",
  },
  largePreview: {
    position: "relative", width: "100%", maxWidth: 300,
    aspectRatio: "3/5", borderRadius: 8, overflow: "hidden",
    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  largePreviewImg: {
    width: "100%", height: "100%", objectFit: "contain",
  },
  largePreviewLabel: {
    position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
    fontSize: 11, color: "#fff", whiteSpace: "nowrap",
  },
  empty: {
    color: "#555", fontSize: 13, textAlign: "center", marginTop: 40,
  },
};
