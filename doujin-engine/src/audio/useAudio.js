import { useEffect, useRef } from "react";
import AudioManager from "./AudioManager";

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[useAudio]", ...args);
}

// エンジンステートを監視して AudioManager を駆動するフック
export default function useAudio(state, projectId, { bgmCatalog, seCatalog } = {}) {
  const managerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 初期化
  useEffect(() => {
    log("init: projectId =", projectId);
    const manager = new AudioManager(projectId, { bgmCatalog, seCatalog });
    managerRef.current = manager;

    // ユーザー操作で AudioContext を初期化
    const initOnInteraction = () => {
      log("initOnInteraction: ユーザー操作検出, AudioContext 初期化開始");
      manager.init();
      log("initOnInteraction: AudioContext state =", manager.ctx?.state);
      document.removeEventListener("click", initOnInteraction);
      document.removeEventListener("keydown", initOnInteraction);
      // 初期化完了後、既に設定されている BGM があれば再生を試みる
      const s = stateRef.current;
      if (s.bgmPlaying) {
        const bgm = s.bgmPlaying;
        const name = typeof bgm === "string" ? bgm : bgm.name;
        const opts = typeof bgm === "object" ? { volume: bgm.volume, loop: bgm.loop } : {};
        log("initOnInteraction: 保留中の BGM を再生 →", name, opts);
        manager.playBGM(name, opts);
      }
    };
    document.addEventListener("click", initOnInteraction);
    document.addEventListener("keydown", initOnInteraction);

    return () => {
      log("cleanup: dispose manager");
      document.removeEventListener("click", initOnInteraction);
      document.removeEventListener("keydown", initOnInteraction);
      manager.dispose();
    };
  }, [projectId]);

  // カタログ変更時にマッピング更新
  useEffect(() => {
    const m = managerRef.current;
    if (m) m.updateCatalog(bgmCatalog, seCatalog);
  }, [bgmCatalog, seCatalog]);

  // BGM 変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m) {
      log("BGM変更: manager 未初期化");
      return;
    }
    const bgm = state.bgmPlaying;
    if (bgm) {
      const name = typeof bgm === "string" ? bgm : bgm.name;
      const opts = typeof bgm === "object" ? { volume: bgm.volume, loop: bgm.loop } : {};
      log("BGM再生 →", name, opts, "| initialized:", m._initialized, "| ctx.state:", m.ctx?.state);
      m.playBGM(name, opts);
    } else {
      log("BGM停止");
      m.stopBGM();
    }
  }, [state.bgmPlaying]);

  // SE 変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m || !state.lastSE) return;
    const se = state.lastSE;
    const name = typeof se === "string" ? se : se.name;
    const opts = typeof se === "object" ? { volume: se.volume } : {};
    log("SE再生 →", name, opts, "| initialized:", m._initialized);
    m.playSE(name, opts);
  }, [state.lastSE]);

  // 音量変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m) return;
    log("音量変更: master =", state.volumeMaster, ", bgm =", state.volumeBGM, ", se =", state.volumeSE);
    if (state.volumeMaster !== undefined) m.setVolume("master", state.volumeMaster);
    if (state.volumeBGM !== undefined) m.setVolume("bgm", state.volumeBGM);
    if (state.volumeSE !== undefined) m.setVolume("se", state.volumeSE);
  }, [state.volumeMaster, state.volumeBGM, state.volumeSE]);

  return managerRef;
}
