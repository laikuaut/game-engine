import "@testing-library/jest-dom";

// localStorage mock
const store = {};
const localStorageMock = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// AudioContext mock
window.AudioContext = class {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
  }
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
      connect: () => {},
    };
  }
  createBufferSource() {
    return { buffer: null, loop: false, connect: () => {}, start: () => {}, stop: () => {} };
  }
  async decodeAudioData() { return {}; }
  async close() { this.state = "closed"; }
};
