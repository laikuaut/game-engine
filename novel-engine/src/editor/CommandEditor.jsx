import { CMD } from "../engine/constants";
import { useMemo } from "react";

// 各コマンドタイプ用の編集フィールド定義
const FIELD_DEFS = {
  [CMD.DIALOG]: [
    { key: "speaker", label: "話者", type: "text", placeholder: "空欄でナレーション", autocomplete: "speakers" },
    { key: "text", label: "テキスト", type: "textarea", placeholder: "セリフを入力…" },
  ],
  [CMD.BG]: [
    { key: "src", label: "背景キー", type: "text", placeholder: "school_gate, classroom, ..." },
    { key: "transition", label: "トランジション", type: "select", options: ["fade", "crossfade", "none"] },
  ],
  [CMD.BGM]: [
    { key: "name", label: "BGM名", type: "text", placeholder: "morning_theme" },
    { key: "loop", label: "ループ", type: "checkbox" },
    { key: "volume", label: "音量 (0-1)", type: "number", min: 0, max: 1, step: 0.1 },
  ],
  [CMD.BGM_STOP]: [
    { key: "fadeout", label: "フェードアウト (ms)", type: "number", min: 0, step: 100 },
  ],
  [CMD.SE]: [
    { key: "name", label: "SE名", type: "text", placeholder: "chime" },
    { key: "volume", label: "音量 (0-1)", type: "number", min: 0, max: 1, step: 0.1 },
  ],
  [CMD.CHARA]: [
    { key: "id", label: "キャラID", type: "text", placeholder: "sakura", autocomplete: "charaIds" },
    { key: "position", label: "位置", type: "select", options: ["left", "center", "right"] },
    { key: "expression", label: "表情", type: "text", placeholder: "smile", autocomplete: "expressions" },
  ],
  [CMD.CHARA_MOD]: [
    { key: "id", label: "キャラID", type: "text", placeholder: "sakura", autocomplete: "charaIds" },
    { key: "expression", label: "表情", type: "text", placeholder: "happy", autocomplete: "expressions" },
  ],
  [CMD.CHARA_HIDE]: [
    { key: "id", label: "キャラID", type: "text", placeholder: "sakura", autocomplete: "charaIds" },
  ],
  [CMD.CHOICE]: [],
  [CMD.EFFECT]: [
    { key: "name", label: "エフェクト", type: "select", options: ["shake", "flash", "fadeout", "whitefade"] },
    { key: "color", label: "色", type: "text", placeholder: "#000" },
    { key: "time", label: "時間 (ms)", type: "number", min: 0, step: 100 },
  ],
  [CMD.WAIT]: [
    { key: "time", label: "待機時間 (ms)", type: "number", min: 0, step: 100 },
  ],
  [CMD.JUMP]: [
    { key: "target", label: "ジャンプ先", type: "text", placeholder: "index or label", autocomplete: "labels" },
  ],
  [CMD.LABEL]: [
    { key: "name", label: "ラベル名", type: "text", placeholder: "chapter1_start" },
  ],
};

function FieldInput({ field, value, onChange, suggestions }) {
  const commonStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#E8E4DC",
    padding: "8px 12px",
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  // バリデーション: 候補がある場合、値が候補に含まれないなら警告表示
  const hasWarning = suggestions && suggestions.length > 0 && value && !suggestions.includes(value);

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={{ ...commonStyle, minHeight: 100, resize: "vertical", lineHeight: 1.8 }}
        />
      );
    case "select":
      return (
        <select
          value={value || field.options[0]}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...commonStyle, cursor: "pointer" }}
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#ccc", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={value !== false}
            onChange={(e) => onChange(e.target.checked)}
            style={{ accentColor: "#C8A870" }}
          />
          {value !== false ? "ON" : "OFF"}
        </label>
      );
    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          min={field.min}
          max={field.max}
          step={field.step}
          style={{ ...commonStyle, width: 160 }}
        />
      );
    default: {
      const listId = suggestions ? `dl-${field.key}-${Date.now()}` : undefined;
      return (
        <div>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={{
              ...commonStyle,
              ...(hasWarning ? { borderColor: "rgba(255,183,77,0.6)" } : {}),
            }}
            list={listId}
          />
          {suggestions && (
            <datalist id={listId}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
          {hasWarning && (
            <div style={{ fontSize: 10, color: "#FFB74D", marginTop: 4 }}>
              未定義の値です（候補: {suggestions.join(", ")}）
            </div>
          )}
        </div>
      );
    }
  }
}

// 選択肢コマンドの特殊エディタ
function ChoiceEditor({ command, onChange }) {
  const options = command.options || [];

  const updateOption = (i, field, value) => {
    const newOpts = options.map((opt, j) =>
      j === i ? { ...opt, [field]: field === "jump" ? Number(value) : value } : opt
    );
    onChange({ options: newOpts });
  };

  const addOption = () => {
    onChange({ options: [...options, { text: "", jump: 0 }] });
  };

  const removeOption = (i) => {
    if (options.length <= 1) return;
    onChange({ options: options.filter((_, j) => j !== i) });
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#E8E4DC",
    padding: "8px 12px",
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#C8A870", marginBottom: 12 }}>選択肢</div>
      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <span style={{ color: "#666", fontSize: 12, width: 20 }}>{i + 1}.</span>
          <input
            type="text"
            value={opt.text}
            onChange={(e) => updateOption(i, "text", e.target.value)}
            placeholder="選択肢テキスト"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="number"
            value={opt.jump}
            onChange={(e) => updateOption(i, "jump", e.target.value)}
            placeholder="jump先"
            min={0}
            style={{ ...inputStyle, width: 80 }}
          />
          <button
            onClick={() => removeOption(i)}
            style={{
              background: "rgba(239,83,80,0.1)",
              border: "1px solid rgba(239,83,80,0.3)",
              color: "#EF5350",
              width: 26,
              height: 26,
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addOption}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px dashed rgba(255,255,255,0.15)",
          color: "#888",
          padding: "6px 16px",
          borderRadius: 3,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "inherit",
          marginTop: 4,
        }}
      >
        ＋ 選択肢を追加
      </button>
    </div>
  );
}

export default function CommandEditor({ command, index, onChange, characters, script }) {
  const fields = FIELD_DEFS[command.type] || [];

  // オートコンプリート候補を構築
  const suggestionMap = useMemo(() => {
    const map = {};
    // キャラID一覧
    const charaIds = Object.keys(characters || {});
    map.charaIds = charaIds;

    // 選択中キャラの表情一覧
    const selectedCharaId = command.id;
    const charaData = characters?.[selectedCharaId];
    map.expressions = charaData?.expressions ? Object.keys(charaData.expressions) : [];

    // スクリプト内の話者一覧（重複排除）
    const speakerSet = new Set();
    (script || []).forEach((cmd) => {
      if (cmd.type === CMD.DIALOG && cmd.speaker) speakerSet.add(cmd.speaker);
    });
    map.speakers = [...speakerSet];

    // ラベル一覧
    const labels = [];
    (script || []).forEach((cmd, i) => {
      if (cmd.type === CMD.LABEL && cmd.name) labels.push(cmd.name);
    });
    map.labels = labels;

    return map;
  }, [characters, command.id, script]);

  return (
    <div>
      {/* ヘッダー */}
      <div style={styles.header}>
        <span style={styles.indexBadge}>#{index}</span>
        <span style={styles.typeBadge}>{command.type}</span>
      </div>

      {/* フィールド */}
      <div style={styles.fields}>
        {fields.map((field) => (
          <div key={field.key} style={styles.fieldGroup}>
            <label style={styles.label}>{field.label}</label>
            <FieldInput
              field={field}
              value={command[field.key]}
              onChange={(val) => onChange({ [field.key]: val })}
              suggestions={field.autocomplete ? suggestionMap[field.autocomplete] : undefined}
            />
          </div>
        ))}

        {/* 選択肢の特殊UI */}
        {command.type === CMD.CHOICE && (
          <ChoiceEditor command={command} onChange={onChange} />
        )}

        {fields.length === 0 && command.type !== CMD.CHOICE && (
          <div style={{ color: "#555", fontSize: 13 }}>
            このコマンドには編集可能なフィールドがありません
          </div>
        )}
      </div>

      {/* RAW JSON 表示 */}
      <div style={styles.rawSection}>
        <div style={styles.rawLabel}>RAW</div>
        <pre style={styles.rawPre}>{JSON.stringify(command, null, 2)}</pre>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid rgba(200,180,140,0.1)",
  },
  indexBadge: {
    fontSize: 12,
    color: "#888",
    fontFamily: "monospace",
  },
  typeBadge: {
    fontSize: 14,
    color: "#E8D4B0",
    background: "rgba(200,180,140,0.1)",
    padding: "3px 12px",
    borderRadius: 3,
    letterSpacing: 1,
    fontWeight: 600,
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: "#C8A870",
    letterSpacing: 0.5,
  },
  rawSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  rawLabel: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    marginBottom: 8,
    letterSpacing: 1,
  },
  rawPre: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.2)",
    padding: 12,
    borderRadius: 4,
    overflow: "auto",
    lineHeight: 1.6,
  },
};
