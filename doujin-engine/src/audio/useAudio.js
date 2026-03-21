import { useEffect, useRef } from "react";
import AudioManager from "./AudioManager";

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[useAudio]", ...args);
}

// エンジンステートを監視して AudioManager を駆動するフック
export default function useAudio(state, projectId) {
  const managerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 初期化
  useEffect(() => {
    log("init: projectId =", projectId);
    const manager = new AudioManager(projectId);
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
        log("initOnInteraction: 保留中の BGM を再生 →", s.bgmPlaying);
        manager.playBGM(s.bgmPlaying);
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

  // BGM 変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m) {
      log("BGM変更: manager 未初期化");
      return;
    }
    if (state.bgmPlaying) {
      log("BGM再生 →", state.bgmPlaying, "| initialized:", m._initialized, "| ctx.state:", m.ctx?.state);
      m.playBGM(state.bgmPlaying);
    } else {
      log("BGM停止");
      m.stopBGM();
    }
  }, [state.bgmPlaying]);

  // SE 変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m || !state.lastSE) return;
    log("SE再生 →", state.lastSE, "| initialized:", m._initialized);
    m.playSE(state.lastSE);
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
