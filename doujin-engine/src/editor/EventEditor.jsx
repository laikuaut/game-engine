import { useState, useMemo } from "react";
import { CMD } from "../engine/constants";

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

// プルダウンコンポーネント
function SelectField({ value, onChange, options, placeholder, style }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...styles.selectSmall, ...style }}
    >
      <option value="" style={styles.optionStyle}>{placeholder || "-- 選択 --"}</option>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return <option key={v} value={v} style={styles.optionStyle}>{label}</option>;
      })}
    </select>
  );
}

// ゲームイベント（条件付きアクション）エディタ
export default function EventEditor({
  events, onUpdateEvents,
  script, items, bgStyles, bgmCatalog, seCatalog, cgCatalog, sceneCatalog, storyScenes,
}) {
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const eventList = events || [];
  const selected = selectedIdx >= 0 ? eventList[selectedIdx] : null;

  // --- 候補リスト生成 ---
  const labels = useMemo(() => {
    return (script || [])
      .filter((c) => c.type === CMD.LABEL && c.name)
      .map((c) => c.name);
  }, [script]);

  const itemOptions = useMemo(() => {
    return (items || []).map((it) => ({ value: it.id || it.name, label: it.name || it.id }));
  }, [items]);

  const bgOptions = useMemo(() => {
    return Object.keys(bgStyles || {});
  }, [bgStyles]);

  const bgmOptions = useMemo(() => {
    return (bgmCatalog || []).map((b) => ({ value: b.name, label: `${b.name}${b.description ? ` (${b.description})` : ""}` }));
  }, [bgmCatalog]);

  const seOptions = useMemo(() => {
    return (seCatalog || []).map((s) => ({ value: s.name, label: `${s.name}${s.description ? ` (${s.description})` : ""}` }));
  }, [seCatalog]);

  const cgOptions = useMemo(() => {
    return (cgCatalog || []).map((c) => ({ value: c.id, label: `${c.id}${c.title ? ` (${c.title})` : ""}` }));
  }, [cgCatalog]);

  const sceneOptions = useMemo(() => {
    return (storyScenes || []).map((s) => ({ value: s.name || s.id, label: s.name || s.id }));
  }, [storyScenes]);

  const sceneCatOptions = useMemo(() => {
    return (sceneCatalog || []).map((s) => ({ value: s.name, label: `${s.name}${s.title ? ` (${s.title})` : ""}` }));
  }, [sceneCatalog]);

  // --- イベント CRUD ---
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

  const duplicateEvent = (idx) => {
    const src = eventList[idx];
    const dup = {
      ...JSON.parse(JSON.stringify(src)),
      id: `evt_${Date.now().toString(36)}`,
      name: `${src.name}(コピー)`,
    };
    const updated = [...eventList, dup];
    onUpdateEvents(updated);
    setSelectedIdx(updated.length - 1);
  };

  const removeEvent = (idx) => {
    const updated = eventList.filter((_, i) => i !== idx);
    onUpdateEvents(updated);
    if (selectedIdx === idx) setSelectedIdx(-1);
    else if (selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  };

  const updateEvent = (idx, updates) => {
    const updated = [...eventList];
    updated[idx] = { ...updated[idx], ...updates };
    onUpdateEvents(updated);
  };

  // --- 条件 ---
  const addCondition = () => {
    if (selectedIdx < 0) return;
    const conds = [...(selected.conditions || []), { type: "flag", key: "", value: "true", operator: "==" }];
    updateEvent(selectedIdx, { conditions: conds });
  };

  const updateCondition = (condIdx, updates) => {
    if (selectedIdx < 0) return;
    const conds = [...(selected.conditions || [])];
    conds[condIdx] = { ...conds[condIdx], ...updates };
    updateEvent(selectedIdx, { conditions: conds });
  };

  const removeCondition = (condIdx) => {
    if (selectedIdx < 0) return;
    const conds = (selected.conditions || []).filter((_, i) => i !== condIdx);
    updateEvent(selectedIdx, { conditions: conds });
  };

  // --- アクション ---
  const addAction = () => {
    if (selectedIdx < 0) return;
    const acts = [...(selected.actions || []), { type: "set_flag", key: "", value: "true" }];
    updateEvent(selectedIdx, { actions: acts });
  };

  const updateAction = (actIdx, updates) => {
    if (selectedIdx < 0) return;
    const acts = [...(selected.actions || [])];
    acts[actIdx] = { ...acts[actIdx], ...updates };
    updateEvent(selectedIdx, { actions: acts });
  };

  const removeAction = (actIdx) => {
    if (selectedIdx < 0) return;
    const acts = (selected.actions || []).filter((_, i) => i !== actIdx);
    updateEvent(selectedIdx, { actions: acts });
  };

  // --- 条件のパラメータUI ---
  const renderConditionParams = (cond, ci) => {
    switch (cond.type) {
      case "flag":
        return (
          <>
            <input
              value={cond.key || ""}
              onChange={(e) => updateCondition(ci, { key: e.target.value })}
              style={styles.inputSmall}
              placeholder="フラグ名"
            />
            <SelectField
              value={cond.operator} onChange={(v) => updateCondition(ci, { operator: v })}
              options={["==", "!="]} style={{ width: 55 }}
            />
            <SelectField
              value={String(cond.value)} onChange={(v) => updateCondition(ci, { value: v })}
              options={[{ value: "true", label: "ON" }, { value: "false", label: "OFF" }]}
              style={{ width: 60 }}
            />
          </>
        );
      case "variable":
        return (
          <>
            <input
              value={cond.key || ""}
              onChange={(e) => updateCondition(ci, { key: e.target.value })}
              style={styles.inputSmall}
              placeholder="変数名"
            />
            <SelectField
              value={cond.operator} onChange={(v) => updateCondition(ci, { operator: v })}
              options={["==", "!=", ">", "<", ">=", "<="]} style={{ width: 55 }}
            />
            <input
              value={cond.value ?? ""}
              onChange={(e) => updateCondition(ci, { value: e.target.value })}
              style={{ ...styles.inputSmall, width: 60 }}
              placeholder="値"
            />
          </>
        );
      case "item_check":
        return (
          <>
            <SelectField
              value={cond.key} onChange={(v) => updateCondition(ci, { key: v })}
              options={itemOptions} placeholder="アイテム"
            />
            <SelectField
              value={cond.operator} onChange={(v) => updateCondition(ci, { operator: v })}
              options={[">=", "==", "<=", ">", "<"]} style={{ width: 55 }}
            />
            <input
              type="number"
              value={cond.value ?? 1}
              onChange={(e) => updateCondition(ci, { value: Number(e.target.value) })}
              style={{ ...styles.inputSmall, width: 50 }}
            />
          </>
        );
      case "scene_viewed":
        return (
          <SelectField
            value={cond.key} onChange={(v) => updateCondition(ci, { key: v })}
            options={sceneOptions} placeholder="シーン"
          />
        );
      case "choice_made":
        return (
          <>
            <SelectField
              value={cond.key} onChange={(v) => updateCondition(ci, { key: v })}
              options={labels} placeholder="ラベル"
            />
            <input
              value={cond.value ?? ""}
              onChange={(e) => updateCondition(ci, { value: e.target.value })}
              style={{ ...styles.inputSmall, width: 60 }}
              placeholder="選択値"
            />
          </>
        );
      default:
        return null;
    }
  };

  // --- アクションのパラメータUI ---
  const renderActionParams = (act, ai) => {
    switch (act.type) {
      case "set_flag":
        return (
          <>
            <input
              value={act.key || ""}
              onChange={(e) => updateAction(ai, { key: e.target.value })}
              style={styles.inputSmall}
              placeholder="フラグ名"
            />
            <SelectField
              value={String(act.value)} onChange={(v) => updateAction(ai, { value: v })}
              options={[{ value: "true", label: "ON" }, { value: "false", label: "OFF" }]}
              style={{ width: 60 }}
            />
          </>
        );
      case "set_variable":
        return (
          <>
            <input
              value={act.key || ""}
              onChange={(e) => updateAction(ai, { key: e.target.value })}
              style={styles.inputSmall}
              placeholder="変数名"
            />
            <SelectField
              value={act.operator || "="} onChange={(v) => updateAction(ai, { operator: v })}
              options={[
                { value: "=", label: "= 代入" },
                { value: "+=", label: "+= 加算" },
                { value: "-=", label: "-= 減算" },
                { value: "*=", label: "*= 乗算" },
              ]}
              style={{ width: 80 }}
            />
            <input
              value={act.value ?? ""}
              onChange={(e) => updateAction(ai, { value: e.target.value })}
              style={{ ...styles.inputSmall, width: 60 }}
              placeholder="値"
            />
          </>
        );
      case "add_item":
      case "remove_item":
        return (
          <>
            <SelectField
              value={act.itemId} onChange={(v) => updateAction(ai, { itemId: v })}
              options={itemOptions} placeholder="アイテム"
            />
            <input
              type="number"
              value={act.amount ?? 1}
              onChange={(e) => updateAction(ai, { amount: Number(e.target.value) })}
              style={{ ...styles.inputSmall, width: 50 }}
              placeholder="数"
            />
          </>
        );
      case "jump_label":
        return (
          <SelectField
            value={act.label} onChange={(v) => updateAction(ai, { label: v })}
            options={labels} placeholder="ラベル"
          />
        );
      case "show_message":
        return (
          <input
            value={act.text || ""}
            onChange={(e) => updateAction(ai, { text: e.target.value })}
            style={{ ...styles.inputSmall, flex: 2 }}
            placeholder="メッセージ"
          />
        );
      case "play_bgm":
        return (
          <SelectField
            value={act.name} onChange={(v) => updateAction(ai, { name: v })}
            options={bgmOptions} placeholder="BGM"
          />
        );
      case "play_se":
        return (
          <SelectField
            value={act.name} onChange={(v) => updateAction(ai, { name: v })}
            options={seOptions} placeholder="SE"
          />
        );
      case "change_bg":
        return (
          <SelectField
            value={act.src} onChange={(v) => updateAction(ai, { src: v })}
            options={bgOptions} placeholder="背景"
          />
        );
      case "unlock_cg":
        return (
          <SelectField
            value={act.id} onChange={(v) => updateAction(ai, { id: v })}
            options={cgOptions} placeholder="CG"
          />
        );
      case "unlock_scene":
        return (
          <SelectField
            value={act.id} onChange={(v) => updateAction(ai, { id: v })}
            options={sceneCatOptions} placeholder="シーン"
          />
        );
      default:
        return null;
    }
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
                  style={{ accentColor: "#C8A870" }}
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
                  <SelectField
                    value={cond.type}
                    onChange={(v) => updateCondition(ci, { type: v, key: "", value: v === "flag" ? "true" : "" })}
                    options={TRIGGER_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                    style={{ width: 110 }}
                  />
                  {renderConditionParams(cond, ci)}
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
                  <SelectField
                    value={act.type}
                    onChange={(v) => updateAction(ai, { type: v, key: "", value: v === "set_flag" ? "true" : "" })}
                    options={ACTION_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                    style={{ width: 110 }}
                  />
                  {renderActionParams(act, ai)}
                  <button onClick={() => removeAction(ai)} style={styles.removeBtn}>x</button>
                </div>
              ))}
              <button onClick={addAction} style={styles.addSmallBtn}>+ アクション追加</button>
            </div>

            {/* 操作 */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => duplicateEvent(selectedIdx)} style={styles.actionBtn}>
                複製
              </button>
              <button onClick={() => removeEvent(selectedIdx)} style={styles.deleteBtn}>
                削除
              </button>
            </div>
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
    fontFamily: "inherit", outline: "none", cursor: "pointer",
  },
  optionStyle: { background: "#1a1a2e", color: "#E8E4DC" },
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
  empty: { color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 },
};
