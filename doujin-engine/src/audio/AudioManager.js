import { getAssetUrl } from "../project/ProjectStore";

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[AudioManager]", ...args);
}

// Web Audio API ベースの BGM/SE 管理
export default class AudioManager {
  constructor(projectId, { bgmCatalog, seCatalog } = {}) {
    this.projectId = projectId || null;
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
    // カタログ: name → filename のマッピング
    this._catalogMap = { bgm: {}, se: {} };
    this.updateCatalog(bgmCatalog, seCatalog);
    log("constructor: projectId =", projectId);
  }

  // カタログ更新（name → filename マッピング再構築）
  updateCatalog(bgmCatalog, seCatalog) {
    this._catalogMap.bgm = {};
    this._catalogMap.se = {};
    (bgmCatalog || []).forEach((e) => {
      if (e.name && e.filename) this._catalogMap.bgm[e.name] = e.filename;
    });
    (seCatalog || []).forEach((e) => {
      if (e.name && e.filename) this._catalogMap.se[e.name] = e.filename;
    });
  }

  // AudioContext を遅延初期化（ユーザー操作後に呼ぶ）
  init() {
    if (this._initialized) {
      // 既に初期化済みでも suspended なら resume
      if (this.ctx && this.ctx.state === "suspended") {
        log("init: resume suspended AudioContext");
        this.ctx.resume();
      }
      return;
    }
    log("init: AudioContext 新規作成");
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    log("init: AudioContext state =", this.ctx.state, ", sampleRate =", this.ctx.sampleRate);
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    this.seGain = this.ctx.createGain();
    this.seGain.connect(this.masterGain);
    this._applyVolumes();
    this._initialized = true;
    log("init: 完了, volumes =", { ...this.volumes });
  }

  // BGM 再生
  async playBGM(name, { volume, loop = true, fadeIn = 500 } = {}) {
    log("playBGM: name =", name, ", loop =", loop, ", fadeIn =", fadeIn, ", initialized =", this._initialized);
    if (!this._initialized) this.init();
    if (this.bgmName === name) {
      log("playBGM: 同じ BGM が再生中のためスキップ");
      return;
    }

    // 前の BGM を停止
    if (this.bgmName) {
      log("playBGM: 前の BGM を停止 →", this.bgmName);
    }
    await this.stopBGM({ fadeOut: 300 });

    log("playBGM: 音声ファイルをロード →", name);
    const buffer = await this._loadAudio(name, "bgm");
    if (!buffer) {
      log("playBGM: ロード失敗, 再生中止");
      return;
    }
    log("playBGM: ロード成功, duration =", buffer.duration.toFixed(2), "s, channels =", buffer.numberOfChannels);

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
    log("playBGM: 再生開始 →", name, ", volume target =", this.volumes.bgm);
  }

  // BGM 停止
  async stopBGM({ fadeOut = 1000 } = {}) {
    if (!this.bgmSource || !this._initialized) {
      log("stopBGM: 停止対象なし (source =", !!this.bgmSource, ", initialized =", this._initialized, ")");
      return;
    }
    const stoppingName = this.bgmName;
    log("stopBGM: フェードアウト開始 →", stoppingName, ", fadeOut =", fadeOut, "ms");
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
        log("stopBGM: 停止完了 →", stoppingName);
        resolve();
      }, fadeOut);
    });
  }

  // SE 再生（ワンショット）
  async playSE(name, { volume } = {}) {
    log("playSE: name =", name, ", initialized =", this._initialized);
    if (!this._initialized) this.init();
    const buffer = await this._loadAudio(name, "se");
    if (!buffer) {
      log("playSE: ロード失敗, 再生中止");
      return;
    }
    log("playSE: ロード成功, duration =", buffer.duration.toFixed(2), "s");

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
    log("playSE: 再生開始 →", name);
  }

  // 音量設定
  setVolume(type, value) {
    const prev = this.volumes[type];
    this.volumes[type] = Math.max(0, Math.min(1, value));
    log("setVolume:", type, prev, "→", this.volumes[type]);
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
    if (this.cache.has(key)) {
      log("_loadAudio: キャッシュヒット →", key);
      return this.cache.get(key);
    }

    const extensions = [".ogg", ".mp3", ".wav"];
    for (const ext of extensions) {
      const path = this._resolveAssetPath(name, type, ext);
      log("_loadAudio: fetch 試行 →", path);
      try {
        const res = await fetch(path);
        if (!res.ok) {
          log("_loadAudio: HTTP", res.status, "→", path);
          continue;
        }
        const arrayBuffer = await res.arrayBuffer();
        log("_loadAudio: デコード中 →", key, ", size =", arrayBuffer.byteLength, "bytes");
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.cache.set(key, audioBuffer);
        log("_loadAudio: デコード成功 →", key);
        return audioBuffer;
      } catch (err) {
        log("_loadAudio: エラー →", path, err.message || err);
      }
    }

    console.warn(`[AudioManager] 音声ファイル未発見: ${type}/${name}`);
    return null;
  }

  _resolveAssetPath(name, type, ext) {
    // プロジェクトID がある場合は ProjectStore 経由で解決
    if (this.projectId) {
      const url = getAssetUrl(this.projectId, type, `${name}${ext}`);
      log("_resolveAssetPath: ProjectStore →", url);
      return url;
    }
    // フォールバック: public/assets/ から
    const url = `./assets/${type}/${name}${ext}`;
    log("_resolveAssetPath: fallback →", url);
    return url;
  }

  // リソース解放
  dispose() {
    log("dispose: BGM =", this.bgmName, ", cache size =", this.cache.size);
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch {}
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
    }
    this.cache.clear();
    this._initialized = false;
    log("dispose: 完了");
  }
}
