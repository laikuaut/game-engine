import { useEffect, useRef } from "react";
import AudioManager from "./AudioManager";

// エンジンステートを監視して AudioManager を駆動するフック
export default function useAudio(state) {
  const managerRef = useRef(null);

  // 初期化
  useEffect(() => {
    const manager = new AudioManager();
    managerRef.current = manager;

    // ユーザー操作で AudioContext を初期化
    const initOnInteraction = () => {
      manager.init();
      document.removeEventListener("click", initOnInteraction);
      document.removeEventListener("keydown", initOnInteraction);
    };
    document.addEventListener("click", initOnInteraction);
    document.addEventListener("keydown", initOnInteraction);

    return () => {
      document.removeEventListener("click", initOnInteraction);
      document.removeEventListener("keydown", initOnInteraction);
      manager.dispose();
    };
  }, []);

  // BGM 変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m) return;
    if (state.bgmPlaying) {
      m.playBGM(state.bgmPlaying);
    } else {
      m.stopBGM();
    }
  }, [state.bgmPlaying]);

  // SE 変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m || !state.lastSE) return;
    m.playSE(state.lastSE);
  }, [state.lastSE]);

  // 音量変更監視
  useEffect(() => {
    const m = managerRef.current;
    if (!m) return;
    if (state.volumeMaster !== undefined) m.setVolume("master", state.volumeMaster);
    if (state.volumeBGM !== undefined) m.setVolume("bgm", state.volumeBGM);
    if (state.volumeSE !== undefined) m.setVolume("se", state.volumeSE);
  }, [state.volumeMaster, state.volumeBGM, state.volumeSE]);

  return managerRef;
}
