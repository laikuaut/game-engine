import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProjects, getProject, createProject, updateProject,
  deleteProject, duplicateProject, exportProject, importProject,
  GAME_TYPE_LABELS,
} from "../project/ProjectStore";

// fetch ベースの API をインメモリでモック
let projectStore = {}; // id → project
let projectIndex = []; // meta 配列

function mockFetch() {
  global.fetch = vi.fn(async (url, opts) => {
    const method = opts?.method || "GET";
    const body = opts?.body ? JSON.parse(opts.body) : null;

    // GET /api/projects
    if (url === "/api/projects" && method === "GET") {
      return { json: async () => [...projectIndex] };
    }
    // POST /api/project-get
    if (url === "/api/project-get" && method === "POST") {
      return { json: async () => projectStore[body.id] || null };
    }
    // POST /api/project-save
    if (url === "/api/project-save" && method === "POST") {
      projectStore[body.id] = body;
      const meta = {
        id: body.id, name: body.name, description: body.description || "",
        gameType: body.gameType || "novel", createdAt: body.createdAt, updatedAt: body.updatedAt,
        scriptLength: body.script?.length || 0,
      };
      const idx = projectIndex.findIndex((p) => p.id === body.id);
      if (idx >= 0) projectIndex[idx] = meta; else projectIndex.push(meta);
      return { json: async () => ({ success: true }) };
    }
    // POST /api/project-delete
    if (url === "/api/project-delete" && method === "POST") {
      delete projectStore[body.id];
      projectIndex = projectIndex.filter((p) => p.id !== body.id);
      return { json: async () => ({ success: true }) };
    }
    return { json: async () => null };
  });
}

describe("ProjectStore", () => {
  beforeEach(() => {
    projectStore = {};
    projectIndex = [];
    localStorage.clear();
    mockFetch();
  });

  it("初期状態はプロジェクトなし", async () => {
    const projects = await getProjects();
    expect(projects).toEqual([]);
  });

  it("プロジェクト作成", async () => {
    const p = await createProject("テスト", "説明");
    expect(p.name).toBe("テスト");
    expect(p.description).toBe("説明");
    expect(p.gameType).toBe("novel");
    expect(p.id).toBeDefined();
    expect(p.script).toBeDefined();
  });

  it("ゲーム種別ごとのテンプレート", async () => {
    const rpg = await createProject("RPG", "", "rpg");
    expect(rpg.gameType).toBe("rpg");
    expect(rpg.maps).toBeDefined();
    expect(rpg.battleData).toBeDefined();

    const mg = await createProject("MG", "", "minigame");
    expect(mg.gameType).toBe("minigame");
    expect(mg.minigames).toBeDefined();
  });

  it("プロジェクト取得", async () => {
    const p = await createProject("Test");
    const found = await getProject(p.id);
    expect(found.name).toBe("Test");
  });

  it("プロジェクト更新", async () => {
    const p = await createProject("Before");
    await updateProject(p.id, { name: "After" });
    const found = await getProject(p.id);
    expect(found.name).toBe("After");
  });

  it("プロジェクト削除", async () => {
    const p = await createProject("Delete Me");
    await deleteProject(p.id);
    const found = await getProject(p.id);
    expect(found).toBe(null);
  });

  it("プロジェクト複製", async () => {
    const p = await createProject("Original");
    const dup = await duplicateProject(p.id);
    expect(dup.name).toContain("コピー");
    expect(dup.id).not.toBe(p.id);
  });

  it("エクスポート / インポート", async () => {
    const p = await createProject("Export Test", "desc");
    const json = await exportProject(p.id);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json);
    expect(parsed._exportVersion).toBe("1.0");
    expect(parsed.saves).toBeUndefined();

    const imported = await importProject(json);
    expect(imported.name).toContain("インポート");
    expect(imported.id).not.toBe(p.id);
  });

  it("不正な JSON のインポートで null", async () => {
    const result = await importProject("invalid json");
    expect(result).toBe(null);
  });

  it("GAME_TYPE_LABELS が定義されている", () => {
    expect(GAME_TYPE_LABELS.novel).toBe("ノベル");
    expect(GAME_TYPE_LABELS.rpg).toBe("RPG");
    expect(GAME_TYPE_LABELS.minigame).toBe("ミニゲーム");
  });
});
