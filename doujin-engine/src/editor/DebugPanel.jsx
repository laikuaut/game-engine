import { useState, useMemo } from "react";
import { CMD, ACTION } from "../engine/constants";
import { getUnlocks, unlock, resetUnlocks, unlockAll } from "../save/UnlockStore";

// スクリプト解析 & バリデーション & ランタイムデバッグパネル
export default function DebugPanel({ script, characters, engineState, cgCatalog, sceneCatalog }) {
  const [expanded, setExpanded] = useState({
    stats: true,
    labels: true,
    errors: true,
    commands: false,
    gameState: false,
    unlocks: false,
    position: false,
  });
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // --- インライン編集用 state ---
  const [editingFlag, setEditingFlag] = useState(null); // { key, value }
  const [editingVar, setEditingVar] = useState(null);   // { key, value }
  const [editingItem, setEditingItem] = useState(null);  // { key, value }
  const [newFlag, setNewFlag] = useState({ key: "", value: true });
  const [newVar, setNewVar] = useState({ key: "", value: 0 });
  const [newItem, setNewItem] = useState({ key: "", value: 1 });
  // CG/シーン解放の再描画用
  const [unlockVersion, setUnlockVersion] = useState(0);

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

  // CG/シーン解放データ
  const unlockData = useMemo(() => {
    // unlockVersion を参照して再計算をトリガー
    void unlockVersion;
    return getUnlocks();
  }, [unlockVersion]);

  // ゲームステートの参照
  const flags = engineState?.flags || {};
  const variables = engineState?.variables || {};
  const items = engineState?.items || {};
  const scriptIndex = engineState?.scriptIndex ?? null;
  const dispatch = engineState?.dispatch || null;

  // --- ゲームステート操作 ---
  const handleSetFlag = (key, value) => {
    if (dispatch) dispatch({ type: ACTION.SET_FLAG, payload: { key, value } });
  };
  const handleSetVariable = (key, value) => {
    if (dispatch) dispatch({ type: ACTION.SET_VARIABLE, payload: { key, value } });
  };
  const handleAddItem = (key, amount) => {
    if (dispatch) dispatch({ type: ACTION.ADD_ITEM, payload: { id: key, amount } });
  };
  const handleRemoveItem = (key) => {
    if (dispatch) dispatch({ type: ACTION.REMOVE_ITEM, payload: { id: key, amount: items[key] || 1 } });
  };

  // --- CG/シーン解放操作 ---
  const handleToggleCG = (cgId) => {
    if (unlockData.cg.includes(cgId)) {
      // 解放済み → 解除（resetして再追加）
      const newCg = unlockData.cg.filter((id) => id !== cgId);
      const newData = { ...unlockData, cg: newCg };
      localStorage.setItem("doujin-engine-unlocks", JSON.stringify(newData));
    } else {
      unlock("cg", cgId);
    }
    setUnlockVersion((v) => v + 1);
  };

  const handleToggleScene = (sceneId) => {
    if (unlockData.scene.includes(sceneId)) {
      const newScene = unlockData.scene.filter((id) => id !== sceneId);
      const newData = { ...unlockData, scene: newScene };
      localStorage.setItem("doujin-engine-unlocks", JSON.stringify(newData));
    } else {
      unlock("scene", sceneId);
    }
    setUnlockVersion((v) => v + 1);
  };

  const handleUnlockAllCG = () => {
    if (cgCatalog) unlockAll(cgCatalog, "cg");
    if (sceneCatalog) unlockAll(sceneCatalog, "scene");
    setUnlockVersion((v) => v + 1);
  };

  const handleResetAll = () => {
    resetUnlocks();
    setUnlockVersion((v) => v + 1);
  };

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
        {/* 実行位置表示 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("position")}>
            <span>{expanded.position ? "\u25BC" : "\u25B6"} 実行位置</span>
          </div>
          {expanded.position && (
            <div style={styles.sectionBody}>
              <Row label="scriptIndex" value={scriptIndex !== null ? scriptIndex : "(未接続)"} />
              <Row label="スクリプト長" value={script?.length || 0} />
              {scriptIndex !== null && script?.[scriptIndex] && (
                <Row label="現在コマンド" value={`${script[scriptIndex].type}`} />
              )}
              {scriptIndex === null && (
                <div style={styles.hintRow}>
                  プレビュー再生中にステートが反映されます
                </div>
              )}
            </div>
          )}
        </div>

        {/* ゲームステート */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("gameState")}>
            <span>{expanded.gameState ? "\u25BC" : "\u25B6"} ゲームステート</span>
          </div>
          {expanded.gameState && (
            <div style={styles.sectionBody}>
              {/* Flags */}
              <div style={styles.subHeader}>Flags</div>
              {Object.keys(flags).length === 0 && <div style={styles.emptyRow}>フラグなし</div>}
              {Object.entries(flags).map(([key, value]) => (
                <div key={`flag-${key}`} style={styles.stateRow}>
                  <span style={styles.stateKey}>{key}</span>
                  {editingFlag?.key === key ? (
                    <div style={styles.editGroup}>
                      <select
                        value={editingFlag.value ? "true" : "false"}
                        onChange={(e) => setEditingFlag({ key, value: e.target.value === "true" })}
                        style={styles.editSelect}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                      <button
                        style={styles.editBtn}
                        onClick={() => { handleSetFlag(key, editingFlag.value); setEditingFlag(null); }}
                      >OK</button>
                      <button style={styles.editBtn} onClick={() => setEditingFlag(null)}>x</button>
                    </div>
                  ) : (
                    <div style={styles.editGroup}>
                      <span style={{ color: value ? "#8BC34A" : "#EF5350" }}>{String(value)}</span>
                      <button style={styles.editBtn} onClick={() => setEditingFlag({ key, value })}>edit</button>
                    </div>
                  )}
                </div>
              ))}
              {/* 新規フラグ追加 */}
              <div style={styles.addRow}>
                <input
                  style={styles.addInput}
                  placeholder="flag名"
                  value={newFlag.key}
                  onChange={(e) => setNewFlag((p) => ({ ...p, key: e.target.value }))}
                />
                <select
                  style={styles.editSelect}
                  value={newFlag.value ? "true" : "false"}
                  onChange={(e) => setNewFlag((p) => ({ ...p, value: e.target.value === "true" }))}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
                <button
                  style={styles.editBtn}
                  onClick={() => {
                    if (newFlag.key && dispatch) {
                      handleSetFlag(newFlag.key, newFlag.value);
                      setNewFlag({ key: "", value: true });
                    }
                  }}
                >+</button>
              </div>

              {/* Variables */}
              <div style={{ ...styles.subHeader, marginTop: 8 }}>Variables</div>
              {Object.keys(variables).length === 0 && <div style={styles.emptyRow}>変数なし</div>}
              {Object.entries(variables).map(([key, value]) => (
                <div key={`var-${key}`} style={styles.stateRow}>
                  <span style={styles.stateKey}>{key}</span>
                  {editingVar?.key === key ? (
                    <div style={styles.editGroup}>
                      <input
                        type="number"
                        value={editingVar.value}
                        onChange={(e) => setEditingVar({ key, value: Number(e.target.value) })}
                        style={styles.editInput}
                      />
                      <button
                        style={styles.editBtn}
                        onClick={() => { handleSetVariable(key, editingVar.value); setEditingVar(null); }}
                      >OK</button>
                      <button style={styles.editBtn} onClick={() => setEditingVar(null)}>x</button>
                    </div>
                  ) : (
                    <div style={styles.editGroup}>
                      <span style={{ color: "#64B5F6" }}>{value}</span>
                      <button style={styles.editBtn} onClick={() => setEditingVar({ key, value })}>edit</button>
                    </div>
                  )}
                </div>
              ))}
              {/* 新規変数追加 */}
              <div style={styles.addRow}>
                <input
                  style={styles.addInput}
                  placeholder="変数名"
                  value={newVar.key}
                  onChange={(e) => setNewVar((p) => ({ ...p, key: e.target.value }))}
                />
                <input
                  type="number"
                  style={styles.editInput}
                  value={newVar.value}
                  onChange={(e) => setNewVar((p) => ({ ...p, value: Number(e.target.value) }))}
                />
                <button
                  style={styles.editBtn}
                  onClick={() => {
                    if (newVar.key && dispatch) {
                      handleSetVariable(newVar.key, newVar.value);
                      setNewVar({ key: "", value: 0 });
                    }
                  }}
                >+</button>
              </div>

              {/* Items */}
              <div style={{ ...styles.subHeader, marginTop: 8 }}>Items</div>
              {Object.keys(items).length === 0 && <div style={styles.emptyRow}>アイテムなし</div>}
              {Object.entries(items).map(([key, value]) => (
                <div key={`item-${key}`} style={styles.stateRow}>
                  <span style={styles.stateKey}>{key}</span>
                  {editingItem?.key === key ? (
                    <div style={styles.editGroup}>
                      <input
                        type="number"
                        value={editingItem.value}
                        onChange={(e) => setEditingItem({ key, value: Number(e.target.value) })}
                        style={styles.editInput}
                      />
                      <button
                        style={styles.editBtn}
                        onClick={() => {
                          const diff = editingItem.value - (items[key] || 0);
                          if (diff > 0) handleAddItem(key, diff);
                          else if (diff < 0) {
                            if (dispatch) dispatch({ type: ACTION.REMOVE_ITEM, payload: { id: key, amount: -diff } });
                          }
                          setEditingItem(null);
                        }}
                      >OK</button>
                      <button style={styles.editBtn} onClick={() => setEditingItem(null)}>x</button>
                    </div>
                  ) : (
                    <div style={styles.editGroup}>
                      <span style={{ color: "#FFD54F" }}>{value}</span>
                      <button style={styles.editBtn} onClick={() => setEditingItem({ key, value })}>edit</button>
                      <button style={{ ...styles.editBtn, color: "#EF5350" }} onClick={() => handleRemoveItem(key)}>del</button>
                    </div>
                  )}
                </div>
              ))}
              {/* 新規アイテム追加 */}
              <div style={styles.addRow}>
                <input
                  style={styles.addInput}
                  placeholder="アイテムID"
                  value={newItem.key}
                  onChange={(e) => setNewItem((p) => ({ ...p, key: e.target.value }))}
                />
                <input
                  type="number"
                  style={styles.editInput}
                  value={newItem.value}
                  onChange={(e) => setNewItem((p) => ({ ...p, value: Number(e.target.value) }))}
                />
                <button
                  style={styles.editBtn}
                  onClick={() => {
                    if (newItem.key && dispatch) {
                      handleAddItem(newItem.key, newItem.value);
                      setNewItem({ key: "", value: 1 });
                    }
                  }}
                >+</button>
              </div>

              {!dispatch && (
                <div style={styles.hintRow}>
                  プレビュー再生中に編集が有効になります
                </div>
              )}
            </div>
          )}
        </div>

        {/* CG/シーン解放管理 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("unlocks")}>
            <span>{expanded.unlocks ? "\u25BC" : "\u25B6"} CG/シーン解放管理</span>
          </div>
          {expanded.unlocks && (
            <div style={styles.sectionBody}>
              {/* 一括操作ボタン */}
              <div style={styles.unlockBtnRow}>
                <button style={styles.unlockAllBtn} onClick={handleUnlockAllCG}>全解放</button>
                <button style={styles.unlockResetBtn} onClick={handleResetAll}>全リセット</button>
              </div>

              {/* CG一覧 */}
              <div style={styles.subHeader}>CG ({unlockData.cg.length} / {(cgCatalog || []).length})</div>
              {(cgCatalog || []).length === 0 && <div style={styles.emptyRow}>CGカタログなし</div>}
              {(cgCatalog || []).map((cg) => {
                const cgId = cg.id || cg.name;
                const isUnlocked = unlockData.cg.includes(cgId);
                return (
                  <div key={`cg-${cgId}`} style={styles.unlockRow}>
                    <span style={{ ...styles.unlockName, color: isUnlocked ? "#8BC34A" : "#555" }}>
                      {cgId}
                    </span>
                    <button
                      style={{
                        ...styles.toggleBtn,
                        background: isUnlocked ? "rgba(139,195,74,0.15)" : "rgba(255,255,255,0.04)",
                        color: isUnlocked ? "#8BC34A" : "#666",
                        borderColor: isUnlocked ? "rgba(139,195,74,0.3)" : "rgba(255,255,255,0.1)",
                      }}
                      onClick={() => handleToggleCG(cgId)}
                    >
                      {isUnlocked ? "解放済" : "未解放"}
                    </button>
                  </div>
                );
              })}

              {/* シーン一覧 */}
              <div style={{ ...styles.subHeader, marginTop: 8 }}>シーン ({unlockData.scene.length} / {(sceneCatalog || []).length})</div>
              {(sceneCatalog || []).length === 0 && <div style={styles.emptyRow}>シーンカタログなし</div>}
              {(sceneCatalog || []).map((sc) => {
                const scId = sc.id || sc.name;
                const isUnlocked = unlockData.scene.includes(scId);
                return (
                  <div key={`sc-${scId}`} style={styles.unlockRow}>
                    <span style={{ ...styles.unlockName, color: isUnlocked ? "#8BC34A" : "#555" }}>
                      {scId}
                    </span>
                    <button
                      style={{
                        ...styles.toggleBtn,
                        background: isUnlocked ? "rgba(139,195,74,0.15)" : "rgba(255,255,255,0.04)",
                        color: isUnlocked ? "#8BC34A" : "#666",
                        borderColor: isUnlocked ? "rgba(139,195,74,0.3)" : "rgba(255,255,255,0.1)",
                      }}
                      onClick={() => handleToggleScene(scId)}
                    >
                      {isUnlocked ? "解放済" : "未解放"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 統計 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("stats")}>
            <span>{expanded.stats ? "\u25BC" : "\u25B6"} スクリプト統計</span>
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
            <span>{expanded.labels ? "\u25BC" : "\u25B6"} ラベル一覧 ({labels.length})</span>
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
              {expanded.errors ? "\u25BC" : "\u25B6"} バリデーション ({errors.length})
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
            <span>{expanded.commands ? "\u25BC" : "\u25B6"} コマンド分布</span>
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
      <span style={styles.rowValue}>{value ?? "\u2014"}</span>
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
  hintRow: { fontSize: 9, color: "#666", fontFamily: "monospace", padding: "4px 0", fontStyle: "italic" },
  // サブヘッダー
  subHeader: {
    fontSize: 10, color: "#9E9E9E", fontFamily: "monospace",
    fontWeight: 700, padding: "4px 0 2px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    letterSpacing: 1,
  },
  // ゲームステート行
  stateRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "3px 0", fontSize: 10, fontFamily: "monospace",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  stateKey: { color: "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  editGroup: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  editBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#999", padding: "1px 6px", borderRadius: 2, fontSize: 9, cursor: "pointer",
    fontFamily: "monospace",
  },
  editInput: {
    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#ccc", padding: "1px 4px", borderRadius: 2, fontSize: 10, width: 50,
    fontFamily: "monospace", outline: "none",
  },
  editSelect: {
    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#ccc", padding: "1px 4px", borderRadius: 2, fontSize: 10,
    fontFamily: "monospace", outline: "none",
  },
  addRow: {
    display: "flex", alignItems: "center", gap: 4, padding: "4px 0",
  },
  addInput: {
    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#ccc", padding: "1px 4px", borderRadius: 2, fontSize: 10, flex: 1,
    fontFamily: "monospace", outline: "none",
  },
  // CG/シーン解放
  unlockBtnRow: {
    display: "flex", gap: 6, padding: "4px 0 8px",
  },
  unlockAllBtn: {
    background: "rgba(139,195,74,0.12)", border: "1px solid rgba(139,195,74,0.3)",
    color: "#8BC34A", padding: "3px 12px", borderRadius: 3, fontSize: 10,
    cursor: "pointer", fontFamily: "monospace",
  },
  unlockResetBtn: {
    background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.3)",
    color: "#EF5350", padding: "3px 12px", borderRadius: 3, fontSize: 10,
    cursor: "pointer", fontFamily: "monospace",
  },
  unlockRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "3px 0", fontSize: 10, fontFamily: "monospace",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  unlockName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  toggleBtn: {
    padding: "1px 8px", borderRadius: 2, fontSize: 9, cursor: "pointer",
    fontFamily: "monospace", borderWidth: 1, borderStyle: "solid", flexShrink: 0,
  },
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
