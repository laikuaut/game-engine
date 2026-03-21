import { describe, it, expect } from "vitest";

// TilesetSplitter のグリッド計算ロジックテスト

describe("タイルセットグリッド計算", () => {
  function calcGrid(imageWidth, imageHeight, gridSize) {
    return {
      cols: Math.floor(imageWidth / gridSize),
      rows: Math.floor(imageHeight / gridSize),
      total: Math.floor(imageWidth / gridSize) * Math.floor(imageHeight / gridSize),
    };
  }

  it("32px グリッドで 256x256 画像 → 8x8 = 64 タイル", () => {
    const { cols, rows, total } = calcGrid(256, 256, 32);
    expect(cols).toBe(8);
    expect(rows).toBe(8);
    expect(total).toBe(64);
  });

  it("16px グリッドで 256x256 画像 → 16x16 = 256 タイル", () => {
    const { cols, rows, total } = calcGrid(256, 256, 16);
    expect(cols).toBe(16);
    expect(rows).toBe(16);
    expect(total).toBe(256);
  });

  it("端数は切り捨て (260x100, 32px → 8x3)", () => {
    const { cols, rows } = calcGrid(260, 100, 32);
    expect(cols).toBe(8);
    expect(rows).toBe(3);
  });

  it("画像がグリッドより小さい場合 → 0 タイル", () => {
    const { cols, rows, total } = calcGrid(20, 20, 32);
    expect(cols).toBe(0);
    expect(rows).toBe(0);
    expect(total).toBe(0);
  });
});

describe("タイルID生成", () => {
  function generateTileId(prefix, col, row, existingIds) {
    let id = `${prefix}_${col}_${row}`;
    let n = 1;
    while (existingIds.has(id)) {
      id = `${prefix}_${col}_${row}_${n++}`;
    }
    return id;
  }

  it("基本的な ID 生成", () => {
    expect(generateTileId("grass", 0, 0, new Set())).toBe("grass_0_0");
    expect(generateTileId("tile", 5, 3, new Set())).toBe("tile_5_3");
  });

  it("重複時にサフィックスが追加される", () => {
    const existing = new Set(["tile_0_0"]);
    expect(generateTileId("tile", 0, 0, existing)).toBe("tile_0_0_1");
  });

  it("複数回の重複に対応", () => {
    const existing = new Set(["tile_0_0", "tile_0_0_1", "tile_0_0_2"]);
    expect(generateTileId("tile", 0, 0, existing)).toBe("tile_0_0_3");
  });
});

describe("タイルセル選択", () => {
  it("セルキーの生成と解析", () => {
    const key = `${3},${5}`;
    expect(key).toBe("3,5");
    const [col, row] = key.split(",").map(Number);
    expect(col).toBe(3);
    expect(row).toBe(5);
  });

  it("選択セルの追加・削除", () => {
    const selected = new Set();
    selected.add("0,0");
    selected.add("1,1");
    expect(selected.size).toBe(2);
    expect(selected.has("0,0")).toBe(true);

    selected.delete("0,0");
    expect(selected.size).toBe(1);
    expect(selected.has("0,0")).toBe(false);
  });

  it("全選択", () => {
    const cols = 4, rows = 3;
    const selected = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        selected.add(`${c},${r}`);
      }
    }
    expect(selected.size).toBe(12);
  });

  it("選択セルのソート（左上→右下）", () => {
    const selected = new Set(["2,1", "0,0", "1,0", "0,1"]);
    const sorted = [...selected].sort((a, b) => {
      const [ac, ar] = a.split(",").map(Number);
      const [bc, br] = b.split(",").map(Number);
      return ar !== br ? ar - br : ac - bc;
    });
    expect(sorted).toEqual(["0,0", "1,0", "0,1", "2,1"]);
  });
});
