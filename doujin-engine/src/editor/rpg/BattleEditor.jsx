import { useState, useCallback } from "react";

// バトル設定のデフォルト
const DEFAULT_ENEMY = {
  id: "",
  name: "スライム",
  hp: 30,
  atk: 5,
  def: 3,
  speed: 4,
  exp: 10,
  gold: 5,
  skills: [],
  drops: [],
  sprite: "",
};

const DEFAULT_SKILL = {
  id: "",
  name: "",
  type: "attack",    // attack | magic | heal | buff | debuff
  power: 10,
  mpCost: 0,
  target: "single",  // single | all | self
  element: "none",   // none | fire | ice | thunder | wind | holy | dark
  description: "",
};

const DEFAULT_BATTLE = {
  id: "",
  name: "バトル 1",
  enemies: [],
  bgm: "",
  background: "",
  escapeAllowed: true,
  rewards: { exp: 0, gold: 0, items: [] },
};

// セクション: 敵 / スキル / バトル構成
const SECTIONS = [
  { id: "enemies", label: "敵キャラ" },
  { id: "skills",  label: "スキル" },
  { id: "battles", label: "バトル構成" },
];

export default function BattleEditor({ battleData: initial, onUpdateBattleData }) {
  const [data, setData] = useState(initial || { enemies: [], skills: [], battles: [] });
  const [section, setSection] = useState("enemies");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const update = useCallback((updates) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      onUpdateBattleData?.(next);
      return next;
    });
  }, [onUpdateBattleData]);

  const list = data[section] || [];
  const current = list[selectedIndex] || null;

  // 追加
  const addItem = () => {
    const templates = {
      enemies: { ...DEFAULT_ENEMY, id: Date.now().toString(36), name: `敵 ${list.length + 1}` },
      skills:  { ...DEFAULT_SKILL, id: Date.now().toString(36), name: `スキル ${list.length + 1}` },
      battles: { ...DEFAULT_BATTLE, id: Date.now().toString(36), name: `バトル ${list.length + 1}` },
    };
    const newList = [...list, templates[section]];
    update({ [section]: newList });
    setSelectedIndex(newList.length - 1);
  };

  // 削除
  const removeItem = (index) => {
    const newList = list.filter((_, i) => i !== index);
    update({ [section]: newList });
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  };

  // 更新
  const updateItem = (index, updates) => {
    const newList = [...list];
    newList[index] = { ...newList[index], ...updates };
    update({ [section]: newList });
  };

  return (
    <div style={styles.container}>
      {/* 左: セクション + リスト */}
      <div style={styles.sidebar}>
        {/* セクション切替 */}
        <div style={styles.sectionTabs}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setSelectedIndex(0); }}
              style={{
                ...styles.sectionTab,
                ...(section === s.id ? styles.sectionTabActive : {}),
              }}
            >
              {s.label}
              <span style={styles.sectionCount}>({(data[s.id] || []).length})</span>
            </button>
          ))}
        </div>

        {/* アイテムリスト */}
        <div style={styles.list}>
          {list.map((item, i) => (
            <div
              key={item.id || i}
              onClick={() => setSelectedIndex(i)}
              style={{
                ...styles.listItem,
                background: i === selectedIndex ? "rgba(200,180,140,0.12)" : "transparent",
                borderLeft: i === selectedIndex ? "3px solid #E8D4B0" : "3px solid transparent",
              }}
            >
              <span style={styles.itemName}>{item.name}</span>
              {section === "enemies" && (
                <span style={styles.itemMeta}>HP:{item.hp} ATK:{item.atk}</span>
              )}
              {section === "skills" && (
                <span style={styles.itemMeta}>{item.type} P:{item.power}</span>
              )}
              {section === "battles" && (
                <span style={styles.itemMeta}>{item.enemies?.length || 0}体</span>
              )}
            </div>
          ))}
          <button onClick={addItem} style={styles.addBtn}>＋ 追加</button>
        </div>
      </div>

      {/* 右: 詳細編集 */}
      <div style={styles.editor}>
        {current ? (
          <>
            <div style={styles.editorHeader}>
              <span style={styles.editorType}>{section}</span>
              <span style={styles.editorId}>#{selectedIndex}</span>
              <button onClick={() => removeItem(selectedIndex)} style={styles.deleteBtn}>削除</button>
            </div>

            {section === "enemies" && <EnemyForm enemy={current} onChange={(u) => updateItem(selectedIndex, u)} allSkills={data.skills} />}
            {section === "skills" && <SkillForm skill={current} onChange={(u) => updateItem(selectedIndex, u)} />}
            {section === "battles" && <BattleForm battle={current} onChange={(u) => updateItem(selectedIndex, u)} allEnemies={data.enemies} />}
          </>
        ) : (
          <div style={styles.emptyEditor}>
            左のリストからアイテムを選択、または「＋追加」で新規作成
          </div>
        )}
      </div>
    </div>
  );
}

// 敵キャラ編集フォーム
function EnemyForm({ enemy, onChange, allSkills }) {
  return (
    <div style={styles.form}>
      <Field label="名前" value={enemy.name} onChange={(v) => onChange({ name: v })} />
      <div style={styles.statGrid}>
        <NumField label="HP" value={enemy.hp} onChange={(v) => onChange({ hp: v })} />
        <NumField label="ATK" value={enemy.atk} onChange={(v) => onChange({ atk: v })} />
        <NumField label="DEF" value={enemy.def} onChange={(v) => onChange({ def: v })} />
        <NumField label="SPD" value={enemy.speed} onChange={(v) => onChange({ speed: v })} />
        <NumField label="EXP" value={enemy.exp} onChange={(v) => onChange({ exp: v })} />
        <NumField label="GOLD" value={enemy.gold} onChange={(v) => onChange({ gold: v })} />
      </div>
      <Field label="スプライト" value={enemy.sprite} onChange={(v) => onChange({ sprite: v })} placeholder="画像パス" />
      <div style={styles.subSection}>
        <span style={styles.subLabel}>使用スキル</span>
        <div style={styles.tagList}>
          {(enemy.skills || []).map((sid, i) => {
            const sk = allSkills?.find((s) => s.id === sid);
            return (
              <span key={i} style={styles.tag}>
                {sk?.name || sid}
                <span onClick={() => onChange({ skills: enemy.skills.filter((_, j) => j !== i) })} style={styles.tagX}>✕</span>
              </span>
            );
          })}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onChange({ skills: [...(enemy.skills || []), e.target.value] });
            }}
            style={styles.selectSmall}
          >
            <option value="">+ スキル追加</option>
            {(allSkills || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// スキル編集フォーム
function SkillForm({ skill, onChange }) {
  return (
    <div style={styles.form}>
      <Field label="名前" value={skill.name} onChange={(v) => onChange({ name: v })} />
      <SelectField label="タイプ" value={skill.type} onChange={(v) => onChange({ type: v })}
        options={["attack", "magic", "heal", "buff", "debuff"]} />
      <div style={styles.statGrid}>
        <NumField label="威力" value={skill.power} onChange={(v) => onChange({ power: v })} />
        <NumField label="MP消費" value={skill.mpCost} onChange={(v) => onChange({ mpCost: v })} />
      </div>
      <SelectField label="対象" value={skill.target} onChange={(v) => onChange({ target: v })}
        options={["single", "all", "self"]} />
      <SelectField label="属性" value={skill.element} onChange={(v) => onChange({ element: v })}
        options={["none", "fire", "ice", "thunder", "wind", "holy", "dark"]} />
      <Field label="説明" value={skill.description} onChange={(v) => onChange({ description: v })} placeholder="スキルの説明文" />
    </div>
  );
}

// バトル構成フォーム
function BattleForm({ battle, onChange, allEnemies }) {
  return (
    <div style={styles.form}>
      <Field label="バトル名" value={battle.name} onChange={(v) => onChange({ name: v })} />
      <Field label="BGM" value={battle.bgm} onChange={(v) => onChange({ bgm: v })} placeholder="battle_theme" />
      <Field label="背景" value={battle.background} onChange={(v) => onChange({ background: v })} placeholder="背景キー" />
      <div style={styles.subSection}>
        <span style={styles.subLabel}>
          出現敵 ({(battle.enemies || []).length})
        </span>
        <div style={styles.tagList}>
          {(battle.enemies || []).map((eid, i) => {
            const en = allEnemies?.find((e) => e.id === eid);
            return (
              <span key={i} style={styles.tag}>
                {en?.name || eid}
                <span onClick={() => onChange({ enemies: battle.enemies.filter((_, j) => j !== i) })} style={styles.tagX}>✕</span>
              </span>
            );
          })}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onChange({ enemies: [...(battle.enemies || []), e.target.value] });
            }}
            style={styles.selectSmall}
          >
            <option value="">+ 敵追加</option>
            {(allEnemies || []).map((en) => (
              <option key={en.id} value={en.id}>{en.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={styles.statGrid}>
        <NumField label="報酬EXP" value={battle.rewards?.exp} onChange={(v) => onChange({ rewards: { ...battle.rewards, exp: v } })} />
        <NumField label="報酬GOLD" value={battle.rewards?.gold} onChange={(v) => onChange({ rewards: { ...battle.rewards, gold: v } })} />
      </div>
      <label style={styles.checkLabel}>
        <input type="checkbox" checked={battle.escapeAllowed !== false}
          onChange={(e) => onChange({ escapeAllowed: e.target.checked })}
          style={{ accentColor: "#C8A870" }} />
        逃走可能
      </label>
    </div>
  );
}

// 共通フィールドコンポーネント
function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>{label}</label>
      <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={styles.input} />
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>{label}</label>
      <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...styles.input, width: 80 }} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>{label}</label>
      <select value={value || options[0]} onChange={(e) => onChange(e.target.value)} style={styles.input}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  sidebar: {
    width: 220, flexShrink: 0, background: "#12121f",
    borderRight: "1px solid rgba(200,180,140,0.1)",
    display: "flex", flexDirection: "column",
  },
  sectionTabs: { display: "flex", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" },
  sectionTab: {
    flex: 1, background: "transparent", border: "none", borderBottom: "2px solid transparent",
    color: "#888", padding: "8px 4px", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
    textAlign: "center", transition: "all 0.2s",
  },
  sectionTabActive: { borderBottomColor: "#E8D4B0", color: "#E8D4B0" },
  sectionCount: { fontSize: 9, color: "#666", marginLeft: 2 },
  list: { flex: 1, overflowY: "auto" },
  listItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 10px", cursor: "pointer", fontSize: 12, transition: "background 0.15s",
  },
  itemName: { color: "#ccc" },
  itemMeta: { color: "#555", fontSize: 9, fontFamily: "monospace" },
  addBtn: {
    width: "calc(100% - 20px)", margin: "6px 10px", background: "transparent",
    border: "1px dashed rgba(200,180,140,0.2)", color: "#C8A870", padding: "6px",
    borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  editor: { flex: 1, overflowY: "auto", padding: 20 },
  editorHeader: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
    paddingBottom: 12, borderBottom: "1px solid rgba(200,180,140,0.1)",
  },
  editorType: {
    fontSize: 12, color: "#E8D4B0", background: "rgba(200,180,140,0.1)",
    padding: "2px 10px", borderRadius: 3, letterSpacing: 1,
  },
  editorId: { fontSize: 11, color: "#666", fontFamily: "monospace" },
  deleteBtn: {
    marginLeft: "auto", background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "3px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  emptyEditor: { color: "#555", fontSize: 14, textAlign: "center", marginTop: 80 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 11, color: "#C8A870", letterSpacing: 0.5 },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none",
  },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  subSection: { marginTop: 4 },
  subLabel: { fontSize: 11, color: "#C8A870", display: "block", marginBottom: 6 },
  tagList: { display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" },
  tag: {
    background: "rgba(90,180,255,0.1)", border: "1px solid rgba(90,180,255,0.25)",
    color: "#5BF", padding: "2px 8px", borderRadius: 3, fontSize: 11,
    display: "flex", alignItems: "center", gap: 4,
  },
  tagX: { cursor: "pointer", color: "#EF5350", fontSize: 10 },
  selectSmall: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa", padding: "3px 6px", borderRadius: 3, fontSize: 10, fontFamily: "inherit", outline: "none",
  },
  checkLabel: { display: "flex", alignItems: "center", gap: 6, color: "#ccc", fontSize: 13 },
};
