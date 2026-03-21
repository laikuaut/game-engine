import { useEffect, useRef, useState } from "react";

// Live2D キャラクター描画コンポーネント
// pixi-live2d-display + PixiJS を使用
// CDN から動的ロード（npm 依存を避ける）

const POS_MAP = { left: "20%", center: "50%", right: "80%" };

const PIXI_CDN = "https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js";
const LIVE2D_CDN = "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js";
const CUBISM_CORE = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

let _loaded = false;
let _loadPromise = null;

async function loadLibraries() {
  if (_loaded) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    await loadScript(PIXI_CDN);
    await loadScript(CUBISM_CORE);
    await loadScript(LIVE2D_CDN);
    _loaded = true;
  })();
  return _loadPromise;
}

export default function Live2DCharacter({ modelPath, position, expression, scale = 0.25, animState }) {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadLibraries();
        if (cancelled || !canvasRef.current) return;

        const PIXI = window.PIXI;
        const { Live2DModel } = window.PIXI.live2d || {};

        if (!Live2DModel) {
          setError("Live2D ライブラリの読み込みに失敗");
          return;
        }

        // PixiJS アプリ作成
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 300,
          height: 500,
          backgroundAlpha: 0,
          autoStart: true,
        });
        appRef.current = app;

        // Live2D モデルロード
        const model = await Live2DModel.from(modelPath);
        model.scale.set(scale);
        model.anchor.set(0.5, 1);
        model.x = app.screen.width / 2;
        model.y = app.screen.height;
        app.stage.addChild(model);
        modelRef.current = model;
      } catch (e) {
        if (!cancelled) setError(e.message || "Live2D ロードエラー");
      }
    })();

    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [modelPath, scale]);

  // 表情変更
  useEffect(() => {
    const model = modelRef.current;
    if (!model || !expression) return;
    try {
      model.expression(expression);
    } catch {}
  }, [expression]);

  // モーション（animState に応じて）
  useEffect(() => {
    const model = modelRef.current;
    if (!model || !animState) return;
    try {
      if (animState === "entering") model.motion("idle");
      else if (animState === "expression_change") model.motion("reaction");
    } catch {}
  }, [animState]);

  if (error) {
    // フォールバック: エラー時は通常の Character 表示用に null を返す
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: "5%",
        left: POS_MAP[position] || "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
        pointerEvents: "none",
        ...(animState === "entering" ? { animation: "charaEnter 500ms ease-out forwards" } : {}),
        ...(animState === "exiting" ? { animation: "charaExit 400ms ease-in forwards" } : {}),
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: 300, height: 500 }}
      />
    </div>
  );
}

// Live2D が利用可能かチェック
export function isLive2DAvailable() {
  return typeof window !== "undefined";
}
