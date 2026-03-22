import { CMD } from "../engine/constants";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { getAssetUrl } from "../project/ProjectStore";

// 各コマンドタイプ用の編集フィールド定義
const FIELD_DEFS = {
  [CMD.DIALOG]: [
    { key: "speaker", label: "話者", type: "text", placeholder: "空欄でナレーション", autocomplete: "speakers" },
    { key: "text", label: "テキスト", type: "textarea", placeholder: "セリフを入力…" },
  ],
  [CMD.BG]: [
    { key: "src", label: "背景キー", type: "catalog_select", placeholder: "背景を選択", autocomplete: "bgKeys" },
    { key: "transition", label: "トランジション", type: "select", options: ["fade", "crossfade", "wipe_left", "wipe_right", "slide_left", "slide_right", "none"] },
  ],
  [CMD.BGM]: [
    { key: "name", label: "BGM名", type: "catalog_select", placeholder: "morning_theme", autocomplete: "bgmNames" },
    { key: "loop", label: "ループ", type: "checkbox" },
    { key: "volume", label: "音量 (0-1)", type: "number", min: 0, max: 1, step: 0.1 },
  ],
  [CMD.BGM_STOP]: [
    { key: "fadeout", label: "フェードアウト (ms)", type: "number", min: 0, step: 100 },
  ],
  [CMD.SE]: [
    { key: "name", label: "SE名", type: "catalog_select", placeholder: "chime", autocomplete: "seNames" },
    { key: "volume", label: "音量 (0-1)", type: "number", min: 0, max: 1, step: 0.1 },
  ],
  [CMD.CHARA]: [
    { key: "id", label: "キャラID", type: "catalog_select", placeholder: "キャラを選択", autocomplete: "charaIds" },
    { key: "position", label: "位置", type: "select", options: ["left", "center", "right"] },
    { key: "expression", label: "表情", type: "expression_select", autocomplete: "expressions" },
    { key: "anim", label: "アニメーション", type: "select", options: ["", "shake", "bounce", "zoom", "nod", "tremble"] },
  ],
  [CMD.CHARA_MOD]: [
    { key: "id", label: "キャラID", type: "catalog_select", placeholder: "キャラを選択", autocomplete: "charaIds" },
    { key: "expression", label: "表情", type: "expression_select", autocomplete: "expressions" },
    { key: "anim", label: "アニメーション", type: "select", options: ["", "shake", "bounce", "zoom", "nod", "tremble"] },
  ],
  [CMD.CHARA_HIDE]: [
    { key: "id", label: "キャラID", type: "catalog_select", placeholder: "キャラを選択", autocomplete: "charaIds" },
  ],
  [CMD.CHOICE]: [],
  [CMD.EFFECT]: [
    { key: "name", label: "エフェクト", type: "select", options: ["shake", "flash", "fadeout", "fadein", "whitefade"] },
    { key: "color", label: "色", type: "text", placeholder: "#000" },
    { key: "time", label: "時間 (ms)", type: "number", min: 0, step: 100 },
    { key: "clearText", label: "台詞をクリア", type: "checkbox" },
  ],
  [CMD.WAIT]: [
    { key: "time", label: "待機時間 (ms)", type: "number", min: 0, step: 100 },
  ],
  [CMD.JUMP]: [
    { key: "target", label: "ジャンプ先ラベル", type: "label_select", autocomplete: "labels" },
  ],
  [CMD.LABEL]: [
    { key: "name", label: "ラベル名", type: "label_input", autocomplete: "labels" },
  ],
  [CMD.SCENE]: [
    { key: "sceneId", label: "シーン", type: "scene_select", autocomplete: "scenes" },
  ],
  [CMD.CG]: [
    { key: "id", label: "CG", type: "catalog_select", placeholder: "CGを選択", autocomplete: "cgIds" },
    { key: "variant", label: "バリアント", type: "number", min: 0, step: 1, placeholder: "空欄=メイン画像" },
  ],
  [CMD.CG_HIDE]: [],
  [CMD.NVL_ON]: [],
  [CMD.NVL_OFF]: [],
  [CMD.NVL_CLEAR]: [],
  // イベント・フラグ・変数
  [CMD.SET_FLAG]: [
    { key: "key", label: "フラグ名", type: "text", placeholder: "purchased_lips" },
    { key: "value", label: "値", type: "select", options: [{ label: "ON (true)", value: "true" }, { label: "OFF (false)", value: "false" }] },
  ],
  [CMD.SET_VARIABLE]: [
    { key: "key", label: "変数名", type: "text", placeholder: "points" },
    { key: "operator", label: "演算子", type: "select", options: ["=", "+=", "-=", "*="] },
    { key: "value", label: "値", type: "number", step: 1 },
  ],
  [CMD.IF_FLAG]: [
    { key: "key", label: "フラグ名", type: "text", placeholder: "purchased_lips" },
    { key: "operator", label: "条件", type: "select", options: ["==", "!="] },
    { key: "value", label: "値", type: "select", options: [{ label: "ON (true)", value: "true" }, { label: "OFF (false)", value: "false" }] },
    { key: "jump", label: "ジャンプ先", type: "label_select", autocomplete: "labels" },
  ],
  [CMD.IF_VARIABLE]: [
    { key: "key", label: "変数名", type: "text", placeholder: "points" },
    { key: "operator", label: "条件", type: "select", options: ["==", "!=", ">", "<", ">=", "<="] },
    { key: "value", label: "値", type: "number", step: 1 },
    { key: "jump", label: "ジャンプ先", type: "label_select", autocomplete: "labels" },
  ],
  [CMD.ADD_ITEM]: [
    { key: "id", label: "アイテムID", type: "text", placeholder: "key_item" },
    { key: "amount", label: "個数", type: "number", min: 1, step: 1 },
  ],
  [CMD.REMOVE_ITEM]: [
    { key: "id", label: "アイテムID", type: "text", placeholder: "key_item" },
    { key: "amount", label: "個数", type: "number", min: 1, step: 1 },
  ],
  [CMD.CHECK_ITEM]: [
    { key: "id", label: "アイテムID", type: "text", placeholder: "key_item" },
    { key: "amount", label: "必要数", type: "number", min: 1, step: 1 },
    { key: "jump", label: "所持時ジャンプ先", type: "label_select", autocomplete: "labels" },
  ],
  [CMD.ACTION_STAGE]: [
    { key: "stageId", label: "ステージID", type: "text", placeholder: "stage_1" },
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
  const optionStyle = { background: "#1a1a2e", color: "#E8E4DC" };

  // バリデーション: 候補がある場合、値が候補に含まれないなら警告表示
  const suggestionValues = suggestions?.map((s) => typeof s === "string" ? s : s.value) || [];
  const hasWarning = suggestions && suggestions.length > 0 && value && !suggestionValues.includes(value);

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
    case "select": {
      const firstOpt = field.options[0];
      const defaultVal = typeof firstOpt === "object" ? firstOpt.value : firstOpt;
      return (
        <select
          value={value ?? defaultVal}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...commonStyle, cursor: "pointer" }}
        >
          {field.options.map((opt) => {
            const optValue = typeof opt === "object" ? opt.value : opt;
            const optLabel = typeof opt === "object" ? opt.label : opt;
            return <option key={optValue} value={optValue} style={optionStyle}>{optLabel}</option>;
          })}
        </select>
      );
    }
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
    case "catalog_select": {
      // カタログに候補がある場合はプルダウン、ない場合はテキスト入力
      if (suggestions && suggestions.length > 0) {
        return (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...commonStyle, cursor: "pointer" }}
          >
            <option value="" style={optionStyle}>-- 選択 --</option>
            {suggestions.map((item) => {
              const v = typeof item === "string" ? item : item.value;
              const l = typeof item === "string" ? item : item.label;
              return <option key={v} value={v} style={optionStyle}>{l}</option>;
            })}
          </select>
        );
      }
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={{ ...commonStyle, opacity: 0.6 }}
        />
      );
    }
    case "expression_select": {
      // 候補がある場合はプルダウン、ない場合はテキスト入力
      if (suggestions && suggestions.length > 0) {
        return (
          <select
            value={value || suggestions[0]}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...commonStyle, cursor: "pointer" }}
          >
            {suggestions.map((expr) => (
              <option key={expr} value={expr} style={optionStyle}>{expr}</option>
            ))}
          </select>
        );
      }
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="キャラIDを先に入力してください"
          style={{ ...commonStyle, opacity: 0.6 }}
        />
      );
    }
    case "scene_select": {
      const sceneList = suggestions || [];
      if (sceneList.length > 0) {
        const currentScene = sceneList.find((s) => s.id === value);
        return (
          <div>
            <select
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              style={{ ...commonStyle, cursor: "pointer" }}
            >
              <option value="" style={optionStyle}>-- シーンを選択 --</option>
              {sceneList.map((s) => (
                <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>
              ))}
            </select>
            {value && !currentScene && (
              <div style={{
                fontSize: 11, color: "#EF5350", marginTop: 6,
                padding: "4px 8px", borderRadius: 3,
                background: "rgba(239,83,80,0.08)",
                border: "1px solid rgba(239,83,80,0.2)",
              }}>
                ⚠ 「{value}」は存在しないシーンです
              </div>
            )}
          </div>
        );
      }
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="シーン編集タブでシーンを作成してください"
          style={{ ...commonStyle, opacity: 0.6 }}
        />
      );
    }
    case "label_select": {
      // ラベル選択（jump先など — セレクトボックスでラベル一覧から選択）
      const labelList = suggestions || [];
      const valStr = String(value ?? "");
      const isInvalid = valStr !== "" && !labelList.includes(valStr);
      return (
        <div>
          <select
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={{
              ...commonStyle, cursor: "pointer",
              ...(isInvalid ? { borderColor: "rgba(239,83,80,0.6)" } : {}),
            }}
          >
            <option value="" style={optionStyle}>-- ラベルを選択 --</option>
            {labelList.map((l) => (
              <option key={l} value={l} style={optionStyle}>{l}</option>
            ))}
          </select>
          {isInvalid && (
            <div style={{ fontSize: 10, color: "#EF5350", marginTop: 4 }}>
              未定義のラベルです: "{valStr}"
            </div>
          )}
        </div>
      );
    }
    case "label_input": {
      // ラベル名入力（重複チェック付き）
      const existingLabels = suggestions || [];
      const isDuplicate = value && existingLabels.filter((l) => l === value).length > 1;
      return (
        <div>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="label_name"
            style={{
              ...commonStyle,
              ...(isDuplicate ? { borderColor: "rgba(239,83,80,0.6)", background: "rgba(239,83,80,0.06)" } : {}),
            }}
          />
          {isDuplicate && (
            <div style={{ fontSize: 10, color: "#EF5350", marginTop: 4 }}>
              ラベル名が重複しています
            </div>
          )}
        </div>
      );
    }
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
              ...(hasWarning ? { borderColor: "rgba(239,83,80,0.6)", background: "rgba(239,83,80,0.06)" } : {}),
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
            <div style={{
              fontSize: 11, color: "#EF5350", marginTop: 6,
              padding: "4px 8px", borderRadius: 3,
              background: "rgba(239,83,80,0.08)",
              border: "1px solid rgba(239,83,80,0.2)",
            }}>
              ⚠ 「{value}」は定義されていません
              {suggestions.length <= 10 && (
                <span style={{ color: "#888", marginLeft: 6 }}>
                  候補: {suggestions.join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
  }
}

// 選択肢コマンドの特殊エディタ
function ChoiceEditor({ command, onChange, labels }) {
  const options = command.options || [];
  const labelList = labels || [];

  const updateOption = (i, field, value) => {
    const newOpts = options.map((opt, j) =>
      j === i ? { ...opt, [field]: value } : opt
    );
    onChange({ options: newOpts });
  };

  const addOption = () => {
    onChange({ options: [...options, { text: "", jump: "" }] });
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
      {options.map((opt, i) => {
        const jumpStr = String(opt.jump ?? "");
        const isInvalid = jumpStr !== "" && !labelList.includes(jumpStr);
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#666", fontSize: 12, width: 20 }}>{i + 1}.</span>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(i, "text", e.target.value)}
                placeholder="選択肢テキスト"
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={jumpStr}
                onChange={(e) => updateOption(i, "jump", e.target.value)}
                style={{
                  ...inputStyle, width: 160, cursor: "pointer",
                  ...(isInvalid ? { borderColor: "rgba(239,83,80,0.6)" } : {}),
                }}
              >
                <option value="">-- ジャンプ先 --</option>
                {labelList.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
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
            {isInvalid && (
              <div style={{ fontSize: 10, color: "#EF5350", marginLeft: 28, marginTop: 2 }}>
                未定義のラベルです: "{jumpStr}"
              </div>
            )}
          </div>
        );
      })}
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

// BGM/SE テスト再生コンポーネント
function AudioPreview({ command, projectId, bgmCatalog, seCatalog }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const isBGM = command.type === CMD.BGM;
  const isSE = command.type === CMD.SE;
  if (!isBGM && !isSE) return null;

  const catalog = isBGM ? bgmCatalog : seCatalog;
  const entry = (catalog || []).find((e) => e.name === command.name);

  const togglePlayback = useCallback(() => {
    // 停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    if (!entry?.filename || !projectId) return;

    const url = getAssetUrl(projectId, isBGM ? "bgm" : "se", entry.filename);
    const audio = new Audio(url);
    audio.volume = command.volume ?? entry.volume ?? 1.0;
    audio.loop = isBGM && (command.loop !== false);
    audio.onended = () => { audioRef.current = null; setPlaying(false); };
    audio.onerror = () => { audioRef.current = null; setPlaying(false); };
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    audioRef.current = audio;
  }, [entry, projectId, isBGM, command.volume, command.loop]);

  // コンポーネント破棄・コマンド切替時に停止
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [command.name]);

  const noFile = !entry?.filename;
  const noEntry = !entry;

  return (
    <div style={{
      marginTop: 12, padding: 12, borderRadius: 4,
      background: playing ? "rgba(100,200,100,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${playing ? "rgba(100,200,100,0.25)" : "rgba(255,255,255,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={togglePlayback}
          disabled={noFile}
          style={{
            background: playing ? "rgba(239,83,80,0.15)" : "rgba(200,180,140,0.12)",
            border: `1px solid ${playing ? "rgba(239,83,80,0.4)" : "rgba(200,180,140,0.25)"}`,
            color: playing ? "#EF5350" : "#C8A870",
            padding: "6px 16px",
            borderRadius: 4,
            cursor: noFile ? "not-allowed" : "pointer",
            fontSize: 13,
            fontFamily: "inherit",
            opacity: noFile ? 0.4 : 1,
          }}
        >
          {playing ? "■ 停止" : "▶ テスト再生"}
        </button>
        <span style={{ fontSize: 12, color: "#888" }}>
          {noEntry
            ? `「${command.name || ""}」はカタログに未登録`
            : noFile
              ? `「${entry.name}」にファイル未設定`
              : entry.filename}
        </span>
      </div>
    </div>
  );
}

export default function CommandEditor({ command, index, onChange, characters, script, storyScenes, projectId, bgmCatalog, seCatalog, bgStyles, cgCatalog }) {
  const fields = FIELD_DEFS[command.type] || [];

  // オートコンプリート候補を構築
  const suggestionMap = useMemo(() => {
    const map = {};
    // キャラID一覧（名前付き）
    map.charaIds = Object.entries(characters || {}).map(([id, c]) => ({
      value: id,
      label: `${id} (${c.name || id})`,
    }));

    // 選択中キャラの表情一覧（expressions + sprites の両方からキーを収集）
    const selectedCharaId = command.id;
    const charaData = characters?.[selectedCharaId];
    const exprKeys = new Set([
      ...Object.keys(charaData?.expressions || {}),
      ...Object.keys(charaData?.sprites || {}),
    ]);
    map.expressions = [...exprKeys];

    // スクリプト内の話者一覧（重複排除）
    const speakerSet = new Set();
    (script || []).forEach((cmd) => {
      if (cmd.type === CMD.DIALOG && cmd.speaker) speakerSet.add(cmd.speaker);
    });
    map.speakers = [...speakerSet];

    // ラベル一覧（スクリプト内ラベル + シーン名）
    const labels = [];
    (script || []).forEach((cmd) => {
      if (cmd.type === CMD.LABEL && cmd.name) labels.push(cmd.name);
    });
    // シーン名もジャンプ先として有効（展開時にシーン名ラベルが挿入されるため）
    (storyScenes || []).forEach((s) => {
      if (s.name && !labels.includes(s.name)) labels.push(s.name);
    });
    map.labels = labels;

    // シーン一覧（id + name ペア）
    map.sceneIds = (storyScenes || []).map((s) => s.id);
    map.scenes = (storyScenes || []).map((s) => ({ id: s.id, name: s.name }));

    // BGM名一覧（カタログから）
    map.bgmNames = (bgmCatalog || []).map((e) => e.name).filter(Boolean);

    // SE名一覧（カタログから）
    map.seNames = (seCatalog || []).map((e) => e.name).filter(Boolean);

    // 背景キー一覧
    map.bgKeys = Object.keys(bgStyles || {});

    // CG ID一覧（カタログから）
    map.cgIds = (cgCatalog || []).map((cg) => cg.id).filter(Boolean);

    return map;
  }, [characters, command.id, script, storyScenes, bgmCatalog, seCatalog, bgStyles, cgCatalog]);

  return (
    <div>
      {/* ヘッダー */}
      <div style={styles.header}>
        <span style={styles.indexBadge}>#{index}</span>
        <span style={styles.typeBadge}>{command.type}</span>
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: command.disabled ? "#EF5350" : "#888", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!command.disabled}
            onChange={(e) => onChange({ ...command, disabled: !e.target.checked })}
            style={{ accentColor: "#C8A870" }}
          />
          {command.disabled ? "無効" : "有効"}
        </label>
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

        {/* BGM/SE テスト再生 */}
        {(command.type === CMD.BGM || command.type === CMD.SE) && command.name && (
          <AudioPreview
            command={command}
            projectId={projectId}
            bgmCatalog={bgmCatalog}
            seCatalog={seCatalog}
          />
        )}

        {/* 選択肢の特殊UI */}
        {command.type === CMD.CHOICE && (
          <ChoiceEditor command={command} onChange={onChange} labels={suggestionMap.labels} />
        )}

        {/* シーン参照の情報表示 */}
        {command.type === CMD.SCENE && (() => {
          const scene = (storyScenes || []).find((s) => s.id === command.sceneId);
          if (!scene) return (
            <div style={{ color: "#EF5350", fontSize: 12, marginTop: 8 }}>
              シーンが見つかりません
            </div>
          );
          return (
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 4,
              background: "rgba(100,200,100,0.06)", border: "1px solid rgba(100,200,100,0.2)",
            }}>
              <div style={{ color: "#8BC34A", fontSize: 13, marginBottom: 4 }}>
                {scene.name}
              </div>
              <div style={{ color: "#888", fontSize: 11 }}>
                {scene.commands?.length || 0} コマンド
                {scene.description ? ` — ${scene.description}` : ""}
              </div>
            </div>
          );
        })()}

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
