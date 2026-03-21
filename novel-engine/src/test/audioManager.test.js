import { describe, it, expect } from "vitest";
import AudioManager from "../audio/AudioManager";

describe("AudioManager", () => {
  it("初期状態は未初期化", () => {
    const am = new AudioManager();
    expect(am._initialized).toBe(false);
    expect(am.bgmName).toBe(null);
  });

  it("init() で AudioContext を作成", () => {
    const am = new AudioManager();
    am.init();
    expect(am._initialized).toBe(true);
    expect(am.ctx).toBeDefined();
    expect(am.masterGain).toBeDefined();
  });

  it("二重初期化しない", () => {
    const am = new AudioManager();
    am.init();
    const ctx1 = am.ctx;
    am.init();
    expect(am.ctx).toBe(ctx1);
  });

  it("setVolume でクランプされる", () => {
    const am = new AudioManager();
    am.init();
    am.setVolume("master", 1.5);
    expect(am.volumes.master).toBe(1);
    am.setVolume("bgm", -0.5);
    expect(am.volumes.bgm).toBe(0);
    am.setVolume("se", 0.5);
    expect(am.volumes.se).toBe(0.5);
  });

  it("dispose でクリーンアップ", () => {
    const am = new AudioManager();
    am.init();
    am.dispose();
    expect(am._initialized).toBe(false);
    expect(am.cache.size).toBe(0);
  });
});
