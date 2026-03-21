import { useState, useMemo } from "react";

// CG カタログ管理エディタ
// catalog: [{ id, title, group, thumbnail, src, variants }]
export default function CGCatalogEditor({ catalog, onUpdateCatalog, script }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [filterGroup, setFilterGroup] = useState("");

  const items = catalog || [];
  const selected = selectedIndex !== null ? items[selectedIndex] : null;

  // スクリプト内の CG コマンドから未登録の CG を検出
  const scriptCGs = useMemo(() => {
    const ids = new Set(items.map((c) => c.id));
    const unregistered = [];
    (script || []).forEach((cmd) => {
      if (cmd.type === "cg" && cmd.id && !ids.has(cmd.id)) {
        if (!unregistered.find((u) => u.id === cmd.id)) {
          unregistered.push({ id: cmd.id, src: cmd.src || "" });
        }
      }
    });
    return unregistered;
  }, [script, items]);

  // グループ一覧
  const groups = useMemo(() => {
    const set = new Set(items.map((c) => c.group || "default"));
    return [...set];
  }, [items]);

  // フィルター適用
  const filtered = useMemo(() => {
    if (!filterGroup) return items.map((c, i) => ({ ...c, _idx: i }));
    return items
      .map((c, i) => ({ ...c, _idx: i }))
      .filter((c) => (c.group || "default") === filterGroup);
  }, [items, filterGroup]);

  // CG 追加
  const addCG = (preset) => {
    const newItem = {
      id: preset?.id || `cg_${Date.now().toString(36)}`,
      title: preset?.title || "新しいCG",
      group: "default",
      thumbnail: "",
      src: preset?.src || "",
      variants: [],
    };
    const next = [...items, newItem];
    onUpdateCatalog(next);
    setSelectedIndex(next.length - 1);
  };

  // CG 削除
  const removeCG = (idx) => {
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

  // バリアント追加/削除
  const addVariant = () => {
    if (selectedIndex === null) return;
    const variants = [...(items[selectedIndex].variants || []), ""];
    updateField("variants", variants);
  };

  const updateVariant = (vi, value) => {
    if (selectedIndex === null) return;
    const variants = [...(items[selectedIndex].variants || [])];
    variants[vi] = value;
    updateField("variants", variants);
  };

  const removeVariant = (vi) => {
    if (selectedIndex === null) return;
    const variants = (items[selectedIndex].variants || []).filter((_, i) => i !== vi);
    updateField("variants", variants);
  };

  // 並べ替え
  const moveCG = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onUpdateCatalog(next);
    if (selectedIndex === idx) setSelectedIndex(target);
    else if (selectedIndex === target) setSelectedIndex(idx);
  };

  return (
    <div style={styles.container}>
      {/* 左: CG 一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>CG カタログ</div>

        {/* グループフィルタ */}
        {groups.length > 1 && (
          <div style={styles.groupFilter}>
            <button
              onClick={() => setFilterGroup("")}
              style={{ ...styles.groupBtn, ...(!filterGroup ? styles.groupBtnActive : {}) }}
            >
              全て
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                style={{ ...styles.groupBtn, ...(filterGroup === g ? styles.groupBtnActive : {}) }}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* CG アイテム */}
        {filtered.map((cg) => (
          <div
            key={cg._idx}
            onClick={() => setSelectedIndex(cg._idx)}
            style={{
              ...styles.listItem,
              background: selectedIndex === cg._idx ? "rgba(200,180,140,0.15)" : "transparent",
              borderColor: selectedIndex === cg._idx ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
            }}
          >
            <div style={styles.thumbMini}>
              {cg.thumbnail ? (
                <img src={`./assets/${cg.thumbnail}`} alt="" style={styles.thumbMiniImg}
                  onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <span style={{ fontSize: 16, opacity: 0.3 }}>CG</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.listItemTitle}>{cg.title}</div>
              <div style={styles.listItemId}>{cg.id}</div>
            </div>
            <span style={styles.groupTag}>{cg.group || "default"}</span>
          </div>
        ))}

        {items.length === 0 && (
          <div style={styles.empty}>CGが登録されていません</div>
        )}

        {/* 未登録CG検出 */}
        {scriptCGs.length > 0 && (
          <div style={styles.unregisteredSection}>
            <div style={styles.unregisteredTitle}>
              スクリプト内の未登録CG ({scriptCGs.length})
            </div>
            {scriptCGs.map((cg) => (
              <div key={cg.id} style={styles.unregisteredItem}>
                <span style={styles.listItemId}>{cg.id}</span>
                <button
                  onClick={() => addCG(cg)}
                  style={styles.addSmallBtn}
                >
                  登録
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => addCG()} style={styles.addBtn}>
          + CG を追加
        </button>
      </div>

      {/* 右: 編集パネル */}
      <div style={styles.editor}>
        {selected ? (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>基本情報</div>
              <label style={styles.label}>CG ID</label>
              <input
                value={selected.id}
                onChange={(e) => updateField("id", e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>タイトル</label>
              <input
                value={selected.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>グループ</label>
              <input
                value={selected.group || ""}
                onChange={(e) => updateField("group", e.target.value)}
                style={styles.input}
                placeholder="default"
                list="cg-groups"
              />
              <datalist id="cg-groups">
                {groups.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>画像パス</div>
              <label style={styles.label}>サムネイル (thumbnail)</label>
              <input
                value={selected.thumbnail || ""}
                onChange={(e) => updateField("thumbnail", e.target.value)}
                style={styles.input}
                placeholder="cg/ev01_thumb.png"
              />
              <label style={styles.label}>メイン画像 (src)</label>
              <input
                value={selected.src || ""}
                onChange={(e) => updateField("src", e.target.value)}
                style={styles.input}
                placeholder="cg/ev01.png"
              />
              {/* プレビュー */}
              {(selected.thumbnail || selected.src) && (
                <div style={styles.previewBox}>
                  <img
                    src={`./assets/${selected.thumbnail || selected.src}`}
                    alt=""
                    style={styles.previewImg}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                バリアント ({(selected.variants || []).length})
              </div>
              {(selected.variants || []).map((v, vi) => (
                <div key={vi} style={styles.variantRow}>
                  <span style={styles.variantIndex}>{vi + 1}.</span>
                  <input
                    value={v}
                    onChange={(e) => updateVariant(vi, e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="variant_filename"
                  />
                  <button onClick={() => removeVariant(vi)} style={styles.removeBtn}>×</button>
                </div>
              ))}
              <button onClick={addVariant} style={styles.addSmallBtn}>
                + バリアント追加
              </button>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>操作</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => moveCG(selectedIndex, -1)}
                  style={styles.actionBtn}
                  disabled={selectedIndex === 0}
                >
                  ↑ 上へ
                </button>
                <button
                  onClick={() => moveCG(selectedIndex, 1)}
                  style={styles.actionBtn}
                  disabled={selectedIndex >= items.length - 1}
                >
                  ↓ 下へ
                </button>
              </div>
              <button onClick={() => removeCG(selectedIndex)} style={styles.deleteBtn}>
                この CG を削除
              </button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            左のリストから CG を選択、または新規追加してください
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
  groupFilter: {
    display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8,
  },
  groupBtn: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#888", padding: "2px 8px", borderRadius: 3,
    fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  groupBtnActive: {
    background: "rgba(200,180,140,0.15)", borderColor: "rgba(200,180,140,0.4)", color: "#E8D4B0",
  },
  listItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 4, marginBottom: 4, cursor: "pointer",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)",
    transition: "all 0.2s",
  },
  thumbMini: {
    width: 48, height: 27, borderRadius: 3, overflow: "hidden",
    background: "rgba(255,255,255,0.03)", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  thumbMiniImg: { width: "100%", height: "100%", objectFit: "cover" },
  listItemTitle: { color: "#E8D4B0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  listItemId: { color: "#666", fontSize: 10, fontFamily: "monospace" },
  groupTag: {
    fontSize: 9, color: "#888", background: "rgba(255,255,255,0.04)",
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
  previewBox: {
    marginTop: 8, borderRadius: 4, overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)", maxWidth: 320,
  },
  previewImg: { width: "100%", display: "block" },
  variantRow: {
    display: "flex", gap: 8, alignItems: "center", marginBottom: 6,
  },
  variantIndex: { color: "#666", fontSize: 11, width: 20, flexShrink: 0, textAlign: "right" },
  removeBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", width: 24, height: 24, borderRadius: 3, fontSize: 14,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0,
  },
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
  unregisteredTitle: {
    color: "#FFB74D", fontSize: 11, marginBottom: 6, letterSpacing: 0.5,
  },
  unregisteredItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 6px", marginBottom: 2,
  },
  empty: { color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 },
};
