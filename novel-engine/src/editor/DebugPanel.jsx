import { useState, useMemo } from "react";
import { CMD } from "../engine/constants";

// スクリプト解析 & バリデーション デバッグパネル
export default function DebugPanel({ script, characters }) {
  const [expanded, setExpanded] = useState({
    stats: true,
    labels: true,
    errors: true,
    commands: false,
  });
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // コマンド種別ごとのカウント
  const stats = useMemo(() => {
    const counts = {};
    (script || []).forEach((cmd) => {
      counts[cmd.type] = (counts[cmd.type] || 0) + 1;
    });
    return counts;
  }, [script]);

  // ラベル一覧
  const labels = useMemo(() => {
    return (script || [])
      .map((cmd, i) => ({ cmd, index: i }))
      .filter(({ cmd }) => cmd.type === CMD.LABEL);
  }, [script]);

  // バリデーションエラー検出
  const errors = useMemo(() => {
    const errs = [];
    const labelNames = new Set();
    const charaIds = new Set(Object.keys(characters || {}));

    (script || []).forEach((cmd, i) => {
      // ラベル重複チェック
      if (cmd.type === CMD.LABEL) {
        if (!cmd.name) {
          errs.push({ index: i, level: "error", msg: "ラベル名が空です" });
        } else if (labelNames.has(cmd.name)) {
          errs.push({ index: i, level: "error", msg: `ラベル名 "${cmd.name}" が重複しています` });
        }
        labelNames.add(cmd.name);
      }

      // キャラID存在チェック
      if ((cmd.type === CMD.CHARA || cmd.type === CMD.CHARA_MOD || cmd.type === CMD.CHARA_HIDE) && cmd.id) {
        if (charaIds.size > 0 && !charaIds.has(cmd.id)) {
          errs.push({ index: i, level: "warn", msg: `キャラID "${cmd.id}" は未定義です` });
        }
      }

      // 空テキストチェック
      if (cmd.type === CMD.DIALOG && !cmd.text) {
        errs.push({ index: i, level: "warn", msg: "テキストが空のダイアログがあります" });
      }

      // ジャンプ先チェック
      if (cmd.type === CMD.JUMP) {
        const target = cmd.target;
        if (typeof target === "number" && (target < 0 || target >= (script || []).length)) {
          errs.push({ index: i, level: "error", msg: `ジャンプ先 ${target} は範囲外です (0-${(script || []).length - 1})` });
        }
        if (typeof target === "string" && !labelNames.has(target)) {
          // ラベルは後で定義されるかもしれないので2パス目でチェック
        }
      }

      // 選択肢のジャンプ先チェック
      if (cmd.type === CMD.CHOICE) {
        (cmd.options || []).forEach((opt, oi) => {
          if (!opt.text) {
            errs.push({ index: i, level: "warn", msg: `選択肢 ${oi + 1} のテキストが空です` });
          }
        });
      }

      // 背景キーが空
      if (cmd.type === CMD.BG && !cmd.src) {
        errs.push({ index: i, level: "warn", msg: "背景キーが空です" });
      }
    });

    // 2パス目: ジャンプ先ラベルの存在チェック
    (script || []).forEach((cmd, i) => {
      if (cmd.type === CMD.JUMP && typeof cmd.target === "string") {
        if (!labelNames.has(cmd.target)) {
          errs.push({ index: i, level: "error", msg: `ジャンプ先ラベル "${cmd.target}" が見つかりません` });
        }
      }
      if (cmd.type === CMD.CHOICE) {
        (cmd.options || []).forEach((opt, oi) => {
          if (typeof opt.jump === "string" && !labelNames.has(opt.jump)) {
            errs.push({ index: i, level: "error", msg: `選択肢 ${oi + 1} のジャンプ先 "${opt.jump}" が見つかりません` });
          }
        });
      }
    });

    return errs;
  }, [script, characters]);

  const errorCount = errors.filter((e) => e.level === "error").length;
  const warnCount = errors.filter((e) => e.level === "warn").length;

  // テキスト総文字数
  const totalChars = useMemo(() => {
    return (script || [])
      .filter((cmd) => cmd.type === CMD.DIALOG)
      .reduce((sum, cmd) => sum + (cmd.text?.length || 0), 0);
  }, [script]);

  // 推定プレイ時間（1文字40ms + 選択肢待ち時間）
  const estimatedMinutes = useMemo(() => {
    const textMs = totalChars * 40;
    const choiceCount = (script || []).filter((cmd) => cmd.type === CMD.CHOICE).length;
    const totalMs = textMs + choiceCount * 5000;
    return Math.ceil(totalMs / 60000);
  }, [totalChars, script]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>DEBUG</span>
        <span style={styles.summary}>
          {errorCount > 0 && <span style={{ color: "#EF5350" }}>{errorCount} error </span>}
          {warnCount > 0 && <span style={{ color: "#FFB74D" }}>{warnCount} warn </span>}
          {errorCount === 0 && warnCount === 0 && <span style={{ color: "#8BC34A" }}>OK</span>}
        </span>
      </div>

      <div style={styles.content}>
        {/* 統計 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("stats")}>
            <span>{expanded.stats ? "▼" : "▶"} スクリプト統計</span>
          </div>
          {expanded.stats && (
            <div style={styles.sectionBody}>
              <Row label="総コマンド数" value={script?.length || 0} />
              <Row label="テキスト総文字数" value={`${totalChars.toLocaleString()} 文字`} />
              <Row label="推定プレイ時間" value={`約 ${estimatedMinutes} 分`} />
              <Row label="ダイアログ" value={stats[CMD.DIALOG] || 0} />
              <Row label="選択肢" value={stats[CMD.CHOICE] || 0} />
              <Row label="背景変更" value={stats[CMD.BG] || 0} />
              <Row label="キャラ登場" value={stats[CMD.CHARA] || 0} />
              <Row label="表情変更" value={stats[CMD.CHARA_MOD] || 0} />
              <Row label="BGM" value={stats[CMD.BGM] || 0} />
              <Row label="SE" value={stats[CMD.SE] || 0} />
              <Row label="エフェクト" value={stats[CMD.EFFECT] || 0} />
              <Row label="ラベル" value={stats[CMD.LABEL] || 0} />
              <Row label="ジャンプ" value={stats[CMD.JUMP] || 0} />
            </div>
          )}
        </div>

        {/* ラベル一覧 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("labels")}>
            <span>{expanded.labels ? "▼" : "▶"} ラベル一覧 ({labels.length})</span>
          </div>
          {expanded.labels && (
            <div style={styles.sectionBody}>
              {labels.map(({ cmd, index }) => (
                <div key={index} style={styles.labelRow}>
                  <span style={styles.labelIndex}>#{index}</span>
                  <span style={styles.labelName}>{cmd.name || "(空)"}</span>
                  {cmd.recollection && <span style={styles.labelTag}>回想</span>}
                </div>
              ))}
              {labels.length === 0 && <div style={styles.emptyRow}>ラベルなし</div>}
            </div>
          )}
        </div>

        {/* エラー・警告 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("errors")}>
            <span>
              {expanded.errors ? "▼" : "▶"} バリデーション ({errors.length})
            </span>
          </div>
          {expanded.errors && (
            <div style={{ ...styles.sectionBody, maxHeight: 300, overflowY: "auto" }}>
              {errors.map((err, i) => (
                <div key={i} style={styles.errorRow}>
                  <span style={{
                    ...styles.errorLevel,
                    color: err.level === "error" ? "#EF5350" : "#FFB74D",
                  }}>
                    {err.level === "error" ? "ERR" : "WARN"}
                  </span>
                  <span style={styles.errorIndex}>#{err.index}</span>
                  <span style={styles.errorMsg}>{err.msg}</span>
                </div>
              ))}
              {errors.length === 0 && (
                <div style={{ ...styles.emptyRow, color: "#8BC34A" }}>
                  問題は検出されませんでした
                </div>
              )}
            </div>
          )}
        </div>

        {/* コマンド分布 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("commands")}>
            <span>{expanded.commands ? "▼" : "▶"} コマンド分布</span>
          </div>
          {expanded.commands && (
            <div style={styles.sectionBody}>
              {Object.entries(stats)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const pct = Math.round((count / (script?.length || 1)) * 100);
                  return (
                    <div key={type} style={styles.barRow}>
                      <span style={styles.barLabel}>{type}</span>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${pct}%` }} />
                      </div>
                      <span style={styles.barCount}>{count}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value ?? "—"}</span>
    </div>
  );
}

const styles = {
  container: {
    display: "flex", flexDirection: "column", height: "100%",
    background: "rgba(0,0,0,0.3)", borderRadius: 4, overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", background: "rgba(239,83,80,0.08)",
    borderBottom: "1px solid rgba(239,83,80,0.2)", flexShrink: 0,
  },
  title: { fontSize: 12, color: "#EF5350", fontWeight: 700, fontFamily: "monospace", letterSpacing: 2 },
  summary: { fontSize: 11, fontFamily: "monospace" },
  content: { flex: 1, overflowY: "auto", padding: 4 },
  section: { marginBottom: 2 },
  sectionHeader: {
    padding: "6px 10px", fontSize: 11, color: "#C8A870",
    cursor: "pointer", userSelect: "none", fontFamily: "monospace",
  },
  sectionBody: { padding: "0 10px 6px" },
  row: {
    display: "flex", justifyContent: "space-between", padding: "2px 0",
    fontSize: 10, fontFamily: "monospace", borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  rowLabel: { color: "#888" },
  rowValue: { color: "#ccc", textAlign: "right" },
  emptyRow: { fontSize: 10, color: "#555", fontFamily: "monospace", padding: "2px 0" },
  // ラベル
  labelRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "3px 0",
    fontSize: 10, fontFamily: "monospace", borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  labelIndex: { color: "#555", width: 32 },
  labelName: { color: "#8BC34A", flex: 1 },
  labelTag: {
    fontSize: 8, color: "#CE93D8", background: "rgba(206,147,216,0.1)",
    padding: "1px 5px", borderRadius: 2,
  },
  // エラー
  errorRow: {
    display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0",
    fontSize: 10, fontFamily: "monospace", borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  errorLevel: { fontWeight: 700, width: 32, flexShrink: 0 },
  errorIndex: { color: "#555", width: 28, flexShrink: 0 },
  errorMsg: { color: "#ccc", wordBreak: "break-word" },
  // 分布バー
  barRow: {
    display: "flex", alignItems: "center", gap: 6, padding: "2px 0",
    fontSize: 10, fontFamily: "monospace",
  },
  barLabel: { color: "#888", width: 60, flexShrink: 0 },
  barTrack: {
    flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden",
  },
  barFill: { height: "100%", background: "#C8A870", borderRadius: 3 },
  barCount: { color: "#aaa", width: 28, textAlign: "right", flexShrink: 0 },
};
