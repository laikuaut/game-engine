import { useState } from "react";

// アイテム種別
const ITEM_TYPES = [
  { id: "consumable", label: "消費アイテム" },
  { id: "equipment", label: "装備" },
  { id: "key", label: "キーアイテム" },
  { id: "material", label: "素材" },
];

// アイテム定義エディタ
export default function ItemEditor({ items, onUpdateItems }) {
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [filter, setFilter] = useState("all");

  const itemList = items || [];
  const filtered = filter === "all" ? itemList : itemList.filter((i) => i.type === filter);
  const selected = selectedIdx >= 0 ? itemList[selectedIdx] : null;

  // アイテム追加
  const addItem = () => {
    const newItem = {
      id: `item_${Date.now().toString(36)}`,
      name: "新しいアイテム",
      type: "consumable",
      description: "",
      icon: "📦",
      price: 0,
      stackable: true,
      maxStack: 99,
      // 消費アイテム用
      effect: { type: "heal", target: "hp", value: 0 },
      // 装備用
      equipSlot: null,
      stats: {},
    };
    const updated = [...itemList, newItem];
    onUpdateItems(updated);
    setSelectedIdx(updated.length - 1);
  };

  // アイテム削除
  const removeItem = (idx) => {
    const updated = itemList.filter((_, i) => i !== idx);
    onUpdateItems(updated);
    if (selectedIdx === idx) setSelectedIdx(-1);
    else if (selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  };

  // アイテム複製
  const duplicateItem = (idx) => {
    const src = itemList[idx];
    const dup = {
      ...JSON.parse(JSON.stringify(src)),
      id: `item_${Date.now().toString(36)}`,
      name: src.name + "（コピー）",
    };
    const updated = [...itemList, dup];
    onUpdateItems(updated);
    setSelectedIdx(updated.length - 1);
  };

  // フィールド更新
  const updateField = (field, value) => {
    if (selectedIdx < 0) return;
    const updated = [...itemList];
    updated[selectedIdx] = { ...updated[selectedIdx], [field]: value };
    onUpdateItems(updated);
  };

  // effect 更新
  const updateEffect = (field, value) => {
    if (selectedIdx < 0) return;
    const updated = [...itemList];
    updated[selectedIdx] = {
      ...updated[selectedIdx],
      effect: { ...updated[selectedIdx].effect, [field]: value },
    };
    onUpdateItems(updated);
  };

  // stats 更新
  const updateStat = (key, value) => {
    if (selectedIdx < 0) return;
    const updated = [...itemList];
    const stats = { ...updated[selectedIdx].stats, [key]: Number(value) || 0 };
    if (!value && value !== 0) delete stats[key];
    updated[selectedIdx] = { ...updated[selectedIdx], stats };
    onUpdateItems(updated);
  };

  return (
    <div style={styles.container}>
      {/* 左: アイテム一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>アイテム ({itemList.length})</div>

        {/* フィルタ */}
        <div style={styles.filterRow}>
          {[{ id: "all", label: "全て" }, ...ITEM_TYPES].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                ...styles.filterBtn,
                ...(filter === f.id ? styles.filterBtnActive : {}),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.map((item) => {
          const realIdx = itemList.indexOf(item);
          return (
            <div
              key={item.id}
              onClick={() => setSelectedIdx(realIdx)}
              style={{
                ...styles.listItem,
                background: selectedIdx === realIdx ? "rgba(200,180,140,0.15)" : "transparent",
                borderColor: selectedIdx === realIdx ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ fontSize: 18, marginRight: 8 }}>{item.icon || "📦"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.listItemName}>{item.name}</div>
                <div style={styles.listItemMeta}>
                  {ITEM_TYPES.find((t) => t.id === item.type)?.label || item.type}
                  {item.price > 0 && ` · ${item.price}G`}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={styles.empty}>アイテムがありません</div>
        )}
        <button onClick={addItem} style={styles.addBtn}>+ アイテム追加</button>
      </div>

      {/* 右: 編集パネル */}
      <div style={styles.editor}>
        {selected ? (
          <>
            {/* 基本情報 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>基本情報</div>
              <div style={styles.fieldRow}>
                <div style={styles.fieldCol}>
                  <label style={styles.label}>アイテム ID</label>
                  <input value={selected.id} onChange={(e) => updateField("id", e.target.value)} style={styles.input} />
                </div>
                <div style={{ width: 80 }}>
                  <label style={styles.label}>アイコン</label>
                  <input value={selected.icon || ""} onChange={(e) => updateField("icon", e.target.value)} style={{ ...styles.input, textAlign: "center", fontSize: 18 }} />
                </div>
              </div>
              <label style={styles.label}>アイテム名</label>
              <input value={selected.name} onChange={(e) => updateField("name", e.target.value)} style={styles.input} />
              <label style={styles.label}>種別</label>
              <select value={selected.type} onChange={(e) => updateField("type", e.target.value)} style={styles.select}>
                {ITEM_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <label style={styles.label}>説明</label>
              <textarea
                value={selected.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                style={styles.textarea}
                rows={3}
              />
              <div style={styles.fieldRow}>
                <div style={styles.fieldCol}>
                  <label style={styles.label}>価格（G）</label>
                  <input type="number" value={selected.price || 0} onChange={(e) => updateField("price", Number(e.target.value))} style={styles.input} />
                </div>
                <div style={styles.fieldCol}>
                  <label style={styles.label}>最大スタック</label>
                  <input type="number" value={selected.maxStack || 99} onChange={(e) => updateField("maxStack", Number(e.target.value))} style={styles.input} />
                </div>
              </div>
            </div>

            {/* 消費アイテム: 効果 */}
            {selected.type === "consumable" && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>使用効果</div>
                <label style={styles.label}>効果タイプ</label>
                <select value={selected.effect?.type || "heal"} onChange={(e) => updateEffect("type", e.target.value)} style={styles.select}>
                  <option value="heal">HP 回復</option>
                  <option value="mp_heal">MP 回復</option>
                  <option value="cure">状態異常回復</option>
                  <option value="buff">バフ</option>
                  <option value="damage">ダメージ</option>
                </select>
                <label style={styles.label}>対象</label>
                <select value={selected.effect?.target || "hp"} onChange={(e) => updateEffect("target", e.target.value)} style={styles.select}>
                  <option value="hp">HP</option>
                  <option value="mp">MP</option>
                  <option value="atk">攻撃力</option>
                  <option value="def">防御力</option>
                  <option value="all">全ステータス</option>
                </select>
                <label style={styles.label}>値</label>
                <input type="number" value={selected.effect?.value || 0} onChange={(e) => updateEffect("value", Number(e.target.value))} style={styles.input} />
              </div>
            )}

            {/* 装備: ステータスボーナス */}
            {selected.type === "equipment" && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>装備設定</div>
                <label style={styles.label}>装備スロット</label>
                <select value={selected.equipSlot || ""} onChange={(e) => updateField("equipSlot", e.target.value)} style={styles.select}>
                  <option value="">未設定</option>
                  <option value="weapon">武器</option>
                  <option value="armor">防具</option>
                  <option value="accessory">アクセサリ</option>
                  <option value="head">頭</option>
                  <option value="body">体</option>
                </select>
                <div style={styles.sectionTitle}>ステータスボーナス</div>
                {["atk", "def", "speed", "hp", "mp"].map((stat) => (
                  <div key={stat} style={styles.statRow}>
                    <span style={styles.statLabel}>{stat.toUpperCase()}</span>
                    <input
                      type="number"
                      value={selected.stats?.[stat] || 0}
                      onChange={(e) => updateStat(stat, e.target.value)}
                      style={{ ...styles.input, width: 80 }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* アクション */}
            <div style={styles.actionRow}>
              <button onClick={() => duplicateItem(selectedIdx)} style={styles.actionBtn}>複製</button>
              <button onClick={() => removeItem(selectedIdx)} style={styles.deleteBtn}>削除</button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>左のリストからアイテムを選択、または新規追加してください</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  list: {
    width: 240, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
    overflowY: "auto", padding: 12,
  },
  listHeader: {
    color: "#C8A870", fontSize: 13, letterSpacing: 2, marginBottom: 8,
    borderBottom: "1px solid rgba(200,180,140,0.2)", paddingBottom: 6,
  },
  filterRow: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 },
  filterBtn: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#888", padding: "2px 8px", borderRadius: 3, fontSize: 10,
    cursor: "pointer", fontFamily: "inherit",
  },
  filterBtnActive: {
    background: "rgba(200,180,140,0.12)", borderColor: "rgba(200,180,140,0.3)", color: "#C8A870",
  },
  listItem: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 10px", borderRadius: 4, marginBottom: 3, cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.15s",
  },
  listItemName: { color: "#E8D4B0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  listItemMeta: { color: "#666", fontSize: 10, fontFamily: "monospace" },
  addBtn: {
    width: "100%", marginTop: 8,
    background: "rgba(200,180,140,0.08)", border: "1px dashed rgba(200,180,140,0.25)",
    color: "#C8A870", padding: "8px", borderRadius: 4, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit", letterSpacing: 1,
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
  select: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  },
  textarea: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
    resize: "vertical",
  },
  fieldRow: { display: "flex", gap: 12 },
  fieldCol: { flex: 1 },
  statRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
  },
  statLabel: { color: "#aaa", fontSize: 11, fontFamily: "monospace", width: 50 },
  actionRow: { display: "flex", gap: 8, marginTop: 16 },
  actionBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa", padding: "6px 16px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "6px 16px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit",
  },
  empty: { color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 },
};
