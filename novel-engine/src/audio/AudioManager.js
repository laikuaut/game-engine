// Web Audio API ベースの BGM/SE 管理
export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.seGain = null;
    this.bgmSource = null;
    this.bgmBuffer = null;
    this.bgmName = null;
    this.cache = new Map();
    this.volumes = { master: 1.0, bgm: 0.8, se: 1.0 };
    this._initialized = false;
  }

  // AudioContext を遅延初期化（ユーザー操作後に呼ぶ）
  init() {
    if (this._initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    this.seGain = this.ctx.createGain();
    this.seGain.connect(this.masterGain);
    this._applyVolumes();
    this._initialized = true;
  }

  // BGM 再生
  async playBGM(name, { volume, loop = true, fadeIn = 500 } = {}) {
    if (!this._initialized) this.init();
    if (this.bgmName === name) return;

    // 前の BGM を停止
    await this.stopBGM({ fadeOut: 300 });

    const buffer = await this._loadAudio(name, "bgm");
    if (!buffer) return;

    this.bgmBuffer = buffer;
    this.bgmName = name;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(this.bgmGain);

    // フェードイン
    if (volume !== undefined) {
      this.volumes.bgm = volume;
    }
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(
      this.volumes.bgm,
      this.ctx.currentTime + fadeIn / 1000
    );

    source.start(0);
    this.bgmSource = source;
  }

  // BGM 停止
  async stopBGM({ fadeOut = 1000 } = {}) {
    if (!this.bgmSource || !this._initialized) return;
    const source = this.bgmSource;
    this.bgmSource = null;
    this.bgmName = null;

    this.bgmGain.gain.linearRampToValueAtTime(
      0,
      this.ctx.currentTime + fadeOut / 1000
    );

    return new Promise((resolve) => {
      setTimeout(() => {
        try { source.stop(); } catch {}
        resolve();
      }, fadeOut);
    });
  }

  // SE 再生（ワンショット）
  async playSE(name, { volume } = {}) {
    if (!this._initialized) this.init();
    const buffer = await this._loadAudio(name, "se");
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // SE 用の一時 GainNode（個別音量が指定された場合）
    if (volume !== undefined) {
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      gain.connect(this.seGain);
      source.connect(gain);
    } else {
      source.connect(this.seGain);
    }

    source.start(0);
  }

  // 音量設定
  setVolume(type, value) {
    this.volumes[type] = Math.max(0, Math.min(1, value));
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this._initialized) return;
    this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
    this.bgmGain.gain.setValueAtTime(this.volumes.bgm, this.ctx.currentTime);
    this.seGain.gain.setValueAtTime(this.volumes.se, this.ctx.currentTime);
  }

  // オーディオファイルのロード + キャッシュ
  async _loadAudio(name, type) {
    const key = `${type}/${name}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const extensions = [".ogg", ".mp3", ".wav"];
    for (const ext of extensions) {
      const path = this._resolveAssetPath(name, type, ext);
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.cache.set(key, audioBuffer);
        return audioBuffer;
      } catch {
        // 次の拡張子を試す
      }
    }

    console.warn(`音声ファイル未発見: ${type}/${name}`);
    return null;
  }

  _resolveAssetPath(name, type, ext) {
    // Electron: extraResources から
    // ブラウザ: public/assets/ から
    return `./assets/${type}/${name}${ext}`;
  }

  // リソース解放
  dispose() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch {}
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
    }
    this.cache.clear();
    this._initialized = false;
  }
}
