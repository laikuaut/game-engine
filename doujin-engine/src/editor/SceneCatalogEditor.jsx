import { useState, useMemo, useRef } from "react";
import { uploadAsset, deleteAsset, getAssetUrl } from "../project/ProjectStore";

// シーン回想カタログ管理エディタ
// catalog: [{ name (シーン名), title, chapter, thumbnail }]
// storyScenes: [{ id, name, description, commands }]
export default function SceneCatalogEditor({ catalog, onUpdateCatalog, script, storyScenes, projectId }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const items = catalog || [];
  const scenes = storyScenes || [];
  const selected = selectedIndex !== null ? items[selectedIndex] : null;

  // シーン名一覧（プルダウン用）
  const sceneNames = useMemo(() => scenes.map((s) => s.name), [scenes]);

  // 登録済みシーン名のセット
  const registeredNames = useMemo(() => new Set(items.map((s) => s.name)), [items]);

  // 未登録のシーン（回想候補として自動検出）
  const unregisteredScenes = useMemo(() => {
    return scenes.filter((s) => !registeredNames.has(s.name));
  }, [scenes, registeredNames]);

  // チャプター一覧
  const chapters = useMemo(() => {
    const set = new Set(items.map((s) => s.chapter || "その他"));
    return [...set];
  }, [items]);

  // チャプター別グルーピング
  const grouped = useMemo(() => {
    const map = {};
    items.forEach((item, i) => {
      const ch = item.chapter || "その他";
      if (!map[ch]) map[ch] = [];
      map[ch].push({ ...item, _idx: i });
    });
    return map;
  }, [items]);

  // シーン追加
  const addScene = (preset) => {
    const newItem = {
      name: preset?.name || "",
      title: preset?.title || "新しいシーン",
      chapter: "その他",
      thumbnail: "",
    };
    const next = [...items, newItem];
    onUpdateCatalog(next);
    setSelectedIndex(next.length - 1);
  };

  // シーン削除
  const removeScene = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    onUpdateCatalog(next);
    if (selectedIndex === idx) setSelectedIndex(null);
    else if (selectedIndex > idx) setSelectedIndex(selectedIndex - 1);
  };

  // フィールド更新
  const updateField = (field, value) => {
    if (selectedIndex === null) return;
    const next = [...items];
    next[selectedIndex] = { ...next[selectedIndex], [field]: value };
    onUpdateCatalog(next);
  };

  // 並べ替え
  const moveScene = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onUpdateCatalog(next);
    if (selectedIndex === idx) setSelectedIndex(target);
    else if (selectedIndex === target) setSelectedIndex(idx);
  };

  // 画像URLの解決
  const resolveImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith("/") || filename.startsWith("http")) return filename;
    if (projectId) return getAssetUrl(projectId, "scene", filename);
    return `./assets/scene/${filename}`;
  };

  // サムネイルアップロード
  const handleUpload = async (file) => {
    if (!projectId || !file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(projectId, "scene", file);
      if (result.filename) {
        updateField("thumbnail", result.filename);
      }
    } finally {
      setUploading(false);
    }
  };

  // 選択中シーンがstoryScenesに存在するか
  const selectedSceneExists = selected && sceneNames.includes(selected.name);

  return (
    <div style={styles.container}>
      {/* 左: シーン一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>シーンカタログ</div>

        {/* チャプター別表示 */}
        {Object.entries(grouped).map(([chapter, groupScenes]) => (
          <div key={chapter}>
            <div style={styles.chapterLabel}>{chapter}</div>
            {groupScenes.map((scene) => {
              const exists = sceneNames.includes(scene.name);
              return (
                <div
                  key={scene._idx}
                  onClick={() => setSelectedIndex(scene._idx)}
                  style={{
                    ...styles.listItem,
                    background: selectedIndex === scene._idx ? "rgba(200,180,140,0.15)" : "transparent",
                    borderColor: selectedIndex === scene._idx ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.listItemTitle}>{scene.title}</div>
                    <div style={styles.listItemId}>{scene.name || "(未設定)"}</div>
                  </div>
                  {exists ? (
                    <span style={styles.linkedBadge}>LINK</span>
                  ) : (
                    <span style={styles.unlinkedBadge}>?</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {items.length === 0 && (
          <div style={styles.empty}>シーンが登録されていません</div>
        )}

        {/* 未登録のシーン */}
        {unregisteredScenes.length > 0 && (
          <div style={styles.unregisteredSection}>
            <div style={styles.unregisteredTitle}>
              未登録のシーン ({unregisteredScenes.length})
            </div>
            {unregisteredScenes.map((s) => (
              <div key={s.id} style={styles.unregisteredItem}>
                <span style={styles.listItemId}>{s.name}</span>
                <button
                  onClick={() => addScene({ name: s.name, title: s.name })}
                  style={styles.addSmallBtn}
                >
                  登録
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => addScene()} style={styles.addBtn}>
          + シーンを追加
        </button>
      </div>

      {/* 右: 編集パネル */}
      <div style={styles.editor}>
        {selected ? (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>基本情報</div>
              <label style={styles.label}>シーン名</label>
              <select
                value={selected.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  ...(!selectedSceneExists && selected.name ? { borderColor: "rgba(239,83,80,0.6)" } : {}),
                }}
              >
                <option value="" style={styles.optionStyle}>-- シーンを選択 --</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.name} style={styles.optionStyle}>
                    {s.name}
                  </option>
                ))}
              </select>
              {selected.name && !selectedSceneExists && (
                <div style={styles.warning}>
                  シーン "{selected.name}" が見つかりません
                </div>
              )}

              <label style={styles.label}>表示タイトル</label>
              <input
                value={selected.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                style={styles.input}
                placeholder="シーンタイトル"
              />
              <label style={styles.label}>チャプター</label>
              <input
                value={selected.chapter || ""}
                onChange={(e) => updateField("chapter", e.target.value)}
                style={styles.input}
                placeholder="その他"
                list="scene-chapters"
              />
              <datalist id="scene-chapters">
                {chapters.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>サムネイル</div>
              <div style={styles.uploadRow}>
                <input
                  value={selected.thumbnail || ""}
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="ファイル名 or アップロード"
                  readOnly
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={styles.uploadBtn}
                  disabled={uploading}
                >
                  {uploading ? "..." : "アップロード"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => { handleUpload(e.target.files[0]); e.target.value = ""; }}
                />
              </div>
              {selected.thumbnail && (
                <div style={styles.previewBox}>
                  <img
                    src={resolveImageUrl(selected.thumbnail)}
                    alt=""
                    style={styles.previewImg}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>操作</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => moveScene(selectedIndex, -1)}
                  style={styles.actionBtn}
                  disabled={selectedIndex === 0}
                >
                  ↑ 上へ
                </button>
                <button
                  onClick={() => moveScene(selectedIndex, 1)}
                  style={styles.actionBtn}
                  disabled={selectedIndex >= items.length - 1}
                >
                  ↓ 下へ
                </button>
              </div>
              <button onClick={() => removeScene(selectedIndex)} style={styles.deleteBtn}>
                このシーンを削除
              </button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            左のリストからシーンを選択、または新規追加してください
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  list: {
    width: 280, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
    overflowY: "auto", padding: 12,
  },
  listHeader: {
    color: "#C8A870", fontSize: 13, letterSpacing: 2, marginBottom: 12,
    borderBottom: "1px solid rgba(200,180,140,0.2)", paddingBottom: 6,
  },
  chapterLabel: {
    color: "#C8A870", fontSize: 11, letterSpacing: 1, marginTop: 12, marginBottom: 4,
    paddingBottom: 2, borderBottom: "1px solid rgba(200,180,140,0.1)",
    opacity: 0.8,
  },
  listItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 4, marginBottom: 4, cursor: "pointer",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)",
    transition: "all 0.2s",
  },
  listItemTitle: { color: "#E8D4B0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  listItemId: { color: "#666", fontSize: 10, fontFamily: "monospace" },
  linkedBadge: {
    fontSize: 8, color: "#8BC34A", background: "rgba(139,195,74,0.1)",
    padding: "1px 6px", borderRadius: 2, flexShrink: 0, letterSpacing: 1,
  },
  unlinkedBadge: {
    fontSize: 10, color: "#FFB74D", background: "rgba(255,183,77,0.1)",
    padding: "1px 6px", borderRadius: 2, flexShrink: 0,
  },
  editor: { flex: 1, overflowY: "auto", padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: "#C8A870", fontSize: 13, letterSpacing: 1, marginBottom: 10,
    borderBottom: "1px solid rgba(200,180,140,0.15)", paddingBottom: 4,
  },
  label: { color: "#888", fontSize: 11, display: "block", marginBottom: 4, marginTop: 8 },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  },
  optionStyle: { background: "#1a1a2e", color: "#E8E4DC" },
  warning: {
    fontSize: 10, color: "#EF5350", marginTop: 4,
    padding: "2px 8px", background: "rgba(239,83,80,0.05)", borderRadius: 3,
  },
  uploadRow: {
    display: "flex", gap: 8, alignItems: "center",
  },
  uploadBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "6px 14px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
  },
  previewBox: {
    marginTop: 8, borderRadius: 4, overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)", maxWidth: 240,
  },
  previewImg: { width: "100%", display: "block" },
  addBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "8px 16px", borderRadius: 3, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit", width: "100%", marginTop: 12,
  },
  addSmallBtn: {
    background: "rgba(200,180,140,0.08)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#C8A870", padding: "4px 10px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  actionBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#ccc", padding: "4px 12px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "8px 16px", borderRadius: 3,
    fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 16, width: "100%",
  },
  unregisteredSection: {
    marginTop: 16, padding: 8, borderRadius: 4,
    background: "rgba(255,183,77,0.05)", border: "1px solid rgba(255,183,77,0.15)",
  },
  unregisteredTitle: { color: "#FFB74D", fontSize: 11, marginBottom: 6, letterSpacing: 0.5 },
  unregisteredItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 6px", marginBottom: 2,
  },
  empty: { color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 },
};
