import { useState } from "react";

// イベントトリガー種別
const TRIGGER_TYPES = [
  { id: "flag", label: "フラグ条件" },
  { id: "variable", label: "変数条件" },
  { id: "item_check", label: "アイテム所持" },
  { id: "scene_viewed", label: "シーン閲覧済み" },
  { id: "choice_made", label: "選択肢履歴" },
];

// イベントアクション種別
const ACTION_TYPES = [
  { id: "set_flag", label: "フラグ設定" },
  { id: "set_variable", label: "変数設定" },
  { id: "add_item", label: "アイテム追加" },
  { id: "remove_item", label: "アイテム削除" },
  { id: "jump_label", label: "ラベルジャンプ" },
  { id: "show_message", label: "メッセージ表示" },
  { id: "play_bgm", label: "BGM 再生" },
  { id: "play_se", label: "SE 再生" },
  { id: "change_bg", label: "背景変更" },
  { id: "unlock_cg", label: "CG 解放" },
  { id: "unlock_scene", label: "シーン解放" },
];

// ゲームイベント（条件付きアクション）エディタ
export default function EventEditor({ events, onUpdateEvents }) {
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const eventList = events || [];
  const selected = selectedIdx >= 0 ? eventList[selectedIdx] : null;

  // イベント追加
  const addEvent = () => {
    const newEvent = {
      id: `evt_${Date.now().toString(36)}`,
      name: "新しいイベント",
      enabled: true,
      conditions: [],
      actions: [],
    };
    const updated = [...eventList, newEvent];
    onUpdateEvents(updated);
    setSelectedIdx(updated.length - 1);
  };

  // イベント削除
  const removeEvent = (idx) => {
    const updated = eventList.filter((_, i) => i !== idx);
    onUpdateEvents(updated);
    if (selectedIdx === idx) setSelectedIdx(-1);
    else if (selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  };

  // イベント更新
  const updateEvent = (idx, updates) => {
    const updated = [...eventList];
    updated[idx] = { ...updated[idx], ...updates };
    onUpdateEvents(updated);
  };

  // 条件追加
  const addCondition = () => {
    if (selectedIdx < 0) return;
    const conds = [...(selected.conditions || []), { type: "flag", key: "", value: true, operator: "==" }];
    updateEvent(selectedIdx, { conditions: conds });
  };

  // 条件更新
  const updateCondition = (condIdx, updates) => {
    if (selectedIdx < 0) return;
    const conds = [...(selected.conditions || [])];
    conds[condIdx] = { ...conds[condIdx], ...updates };
    updateEvent(selectedIdx, { conditions: conds });
  };

  // 条件削除
  const removeCondition = (condIdx) => {
    if (selectedIdx < 0) return;
    const conds = (selected.conditions || []).filter((_, i) => i !== condIdx);
    updateEvent(selectedIdx, { conditions: conds });
  };

  // アクション追加
  const addAction = () => {
    if (selectedIdx < 0) return;
    const acts = [...(selected.actions || []), { type: "set_flag", key: "", value: true }];
    updateEvent(selectedIdx, { actions: acts });
  };

  // アクション更新
  const updateAction = (actIdx, updates) => {
    if (selectedIdx < 0) return;
    const acts = [...(selected.actions || [])];
    acts[actIdx] = { ...acts[actIdx], ...updates };
    updateEvent(selectedIdx, { actions: acts });
  };

  // アクション削除
  const removeAction = (actIdx) => {
    if (selectedIdx < 0) return;
    const acts = (selected.actions || []).filter((_, i) => i !== actIdx);
    updateEvent(selectedIdx, { actions: acts });
  };

  return (
    <div style={styles.container}>
      {/* 左: イベント一覧 */}
      <div style={styles.list}>
        <div style={styles.listHeader}>イベント ({eventList.length})</div>
        {eventList.map((evt, i) => (
          <div
            key={evt.id}
            onClick={() => setSelectedIdx(i)}
            style={{
              ...styles.listItem,
              background: selectedIdx === i ? "rgba(200,180,140,0.15)" : "transparent",
              borderColor: selectedIdx === i ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
              opacity: evt.enabled ? 1 : 0.5,
            }}
          >
            <div style={styles.listItemName}>{evt.name}</div>
            <div style={styles.listItemMeta}>
              {(evt.conditions || []).length} 条件 / {(evt.actions || []).length} アクション
            </div>
          </div>
        ))}
        {eventList.length === 0 && <div style={styles.empty}>イベントがありません</div>}
        <button onClick={addEvent} style={styles.addBtn}>+ イベント追加</button>
      </div>

      {/* 右: 編集パネル */}
      <div style={styles.editor}>
        {selected ? (
          <>
            {/* 基本情報 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>基本情報</div>
              <label style={styles.label}>イベント名</label>
              <input
                value={selected.name}
                onChange={(e) => updateEvent(selectedIdx, { name: e.target.value })}
                style={styles.input}
              />
              <div style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(e) => updateEvent(selectedIdx, { enabled: e.target.checked })}
                  id="evt-enabled"
                />
                <label htmlFor="evt-enabled" style={styles.checkLabel}>有効</label>
              </div>
            </div>

            {/* 条件 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                条件 ({(selected.conditions || []).length})
                <span style={styles.sectionHint}>すべて満たした時にアクション実行</span>
              </div>
              {(selected.conditions || []).map((cond, ci) => (
                <div key={ci} style={styles.condRow}>
                  <select
                    value={cond.type}
                    onChange={(e) => updateCondition(ci, { type: e.target.value })}
                    style={styles.selectSmall}
                  >
                    {TRIGGER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <input
                    value={cond.key || ""}
                    onChange={(e) => updateCondition(ci, { key: e.target.value })}
                    style={styles.inputSmall}
                    placeholder="キー名"
                  />
                  <select
                    value={cond.operator || "=="}
                    onChange={(e) => updateCondition(ci, { operator: e.target.value })}
                    style={{ ...styles.selectSmall, width: 50 }}
                  >
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                  <input
                    value={cond.value ?? ""}
                    onChange={(e) => updateCondition(ci, { value: e.target.value })}
                    style={styles.inputSmall}
                    placeholder="値"
                  />
                  <button onClick={() => removeCondition(ci)} style={styles.removeBtn}>x</button>
                </div>
              ))}
              <button onClick={addCondition} style={styles.addSmallBtn}>+ 条件追加</button>
            </div>

            {/* アクション */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                アクション ({(selected.actions || []).length})
                <span style={styles.sectionHint}>条件成立時に上から順に実行</span>
              </div>
              {(selected.actions || []).map((act, ai) => (
                <div key={ai} style={styles.actRow}>
                  <select
                    value={act.type}
                    onChange={(e) => updateAction(ai, { type: e.target.value })}
                    style={styles.selectSmall}
                  >
                    {ACTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  {/* アクション種別ごとのパラメータ */}
                  {(act.type === "set_flag" || act.type === "set_variable") && (
                    <>
                      <input
                        value={act.key || ""}
                        onChange={(e) => updateAction(ai, { key: e.target.value })}
                        style={styles.inputSmall}
                        placeholder="キー名"
                      />
                      <input
                        value={act.value ?? ""}
                        onChange={(e) => updateAction(ai, { value: e.target.value })}
                        style={styles.inputSmall}
                        placeholder="値"
                      />
                    </>
                  )}
                  {(act.type === "add_item" || act.type === "remove_item") && (
                    <>
                      <input
                        value={act.itemId || ""}
                        onChange={(e) => updateAction(ai, { itemId: e.target.value })}
                        style={styles.inputSmall}
                        placeholder="アイテムID"
                      />
                      <input
                        type="number"
                        value={act.amount ?? 1}
                        onChange={(e) => updateAction(ai, { amount: Number(e.target.value) })}
                        style={{ ...styles.inputSmall, width: 50 }}
                        placeholder="個数"
                      />
                    </>
                  )}
                  {act.type === "jump_label" && (
                    <input
                      value={act.label || ""}
                      onChange={(e) => updateAction(ai, { label: e.target.value })}
                      style={styles.inputSmall}
                      placeholder="ラベル名"
                    />
                  )}
                  {act.type === "show_message" && (
                    <input
                      value={act.text || ""}
                      onChange={(e) => updateAction(ai, { text: e.target.value })}
                      style={{ ...styles.inputSmall, flex: 2 }}
                      placeholder="メッセージ"
                    />
                  )}
                  {(act.type === "play_bgm" || act.type === "play_se") && (
                    <input
                      value={act.name || ""}
                      onChange={(e) => updateAction(ai, { name: e.target.value })}
                      style={styles.inputSmall}
                      placeholder="ファイル名"
                    />
                  )}
                  {act.type === "change_bg" && (
                    <input
                      value={act.src || ""}
                      onChange={(e) => updateAction(ai, { src: e.target.value })}
                      style={styles.inputSmall}
                      placeholder="背景キー"
                    />
                  )}
                  {(act.type === "unlock_cg" || act.type === "unlock_scene") && (
                    <input
                      value={act.id || ""}
                      onChange={(e) => updateAction(ai, { id: e.target.value })}
                      style={styles.inputSmall}
                      placeholder="ID"
                    />
                  )}
                  <button onClick={() => removeAction(ai)} style={styles.removeBtn}>x</button>
                </div>
              ))}
              <button onClick={addAction} style={styles.addSmallBtn}>+ アクション追加</button>
            </div>

            <button onClick={() => removeEvent(selectedIdx)} style={styles.deleteBtn}>
              このイベントを削除
            </button>
          </>
        ) : (
          <div style={styles.empty}>左のリストからイベントを選択、または新規追加してください</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  list: {
    width: 230, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
    overflowY: "auto", padding: 12,
  },
  listHeader: {
    color: "#C8A870", fontSize: 13, letterSpacing: 2, marginBottom: 10,
    borderBottom: "1px solid rgba(200,180,140,0.2)", paddingBottom: 6,
  },
  listItem: {
    padding: "8px 10px", borderRadius: 4, marginBottom: 4, cursor: "pointer",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)",
    transition: "all 0.15s",
  },
  listItemName: { color: "#E8D4B0", fontSize: 13 },
  listItemMeta: { color: "#666", fontSize: 10, fontFamily: "monospace", marginTop: 2 },
  addBtn: {
    width: "100%", marginTop: 10,
    background: "rgba(200,180,140,0.08)", border: "1px dashed rgba(200,180,140,0.25)",
    color: "#C8A870", padding: "8px", borderRadius: 4, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit", letterSpacing: 1,
  },
  editor: { flex: 1, overflowY: "auto", padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: "#C8A870", fontSize: 13, letterSpacing: 1, marginBottom: 10,
    borderBottom: "1px solid rgba(200,180,140,0.15)", paddingBottom: 4,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  sectionHint: { color: "#666", fontSize: 10, fontStyle: "italic" },
  label: { color: "#888", fontSize: 11, display: "block", marginBottom: 4, marginTop: 8 },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  },
  checkRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 },
  checkLabel: { color: "#aaa", fontSize: 12 },
  condRow: { display: "flex", gap: 4, alignItems: "center", marginBottom: 6, flexWrap: "wrap" },
  actRow: { display: "flex", gap: 4, alignItems: "center", marginBottom: 6, flexWrap: "wrap" },
  selectSmall: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "4px 6px", borderRadius: 3, fontSize: 11,
    fontFamily: "inherit", outline: "none",
  },
  inputSmall: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "4px 6px", borderRadius: 3, fontSize: 11,
    fontFamily: "inherit", outline: "none", flex: 1, minWidth: 60,
  },
  addSmallBtn: {
    background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)",
    color: "#888", padding: "4px 10px", borderRadius: 3, fontSize: 10,
    cursor: "pointer", fontFamily: "inherit", marginTop: 4,
  },
  removeBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", width: 20, height: 20, borderRadius: 3, fontSize: 11,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, flexShrink: 0,
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "8px 16px", borderRadius: 3,
    fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 16, width: "100%",
  },
  empty: { color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 },
};
