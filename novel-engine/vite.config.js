import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// 開発サーバー用: data/projects へのファイル保存API（ジャンル別分割対応）
function projectApiPlugin() {
  const projectsDir = path.resolve(__dirname, 'data', 'projects')
  const DATA_FILES = ['script', 'characters', 'items', 'bgStyles', 'maps', 'battleData', 'minigames', 'saves']

  function ensureDir(dir) {
    if (!fs.existsSync(dir || projectsDir)) {
      fs.mkdirSync(dir || projectsDir, { recursive: true })
    }
  }

  function readIndex() {
    const p = path.join(projectsDir, '_index.json')
    if (!fs.existsSync(p)) return []
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return [] }
  }

  function writeIndex(index) {
    fs.writeFileSync(path.join(projectsDir, '_index.json'), JSON.stringify(index, null, 2), 'utf-8')
  }

  function readJson(fp) {
    if (!fs.existsSync(fp)) return undefined
    try { return JSON.parse(fs.readFileSync(fp, 'utf-8')) } catch { return undefined }
  }

  function writeJson(fp, data) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
  }

  // 旧形式（単一ファイル）→ 新形式（ディレクトリ）マイグレーション
  function migrateToSplit(id) {
    ensureDir()
    const oldFile = path.join(projectsDir, `${id}.json`)
    if (!fs.existsSync(oldFile)) return
    const projDir = path.join(projectsDir, id)
    ensureDir(projDir)
    const metaFile = path.join(projDir, 'meta.json')
    if (fs.existsSync(metaFile)) return

    try {
      const project = JSON.parse(fs.readFileSync(oldFile, 'utf-8'))
      const meta = {}
      for (const [k, v] of Object.entries(project)) {
        if (!DATA_FILES.includes(k)) meta[k] = v
      }
      writeJson(metaFile, meta)
      for (const key of DATA_FILES) {
        if (project[key] !== undefined) {
          writeJson(path.join(projDir, `${key}.json`), project[key])
        }
      }
      fs.unlinkSync(oldFile)
      console.log(`[Vite API] Migrated project ${id} to split files`)
    } catch (e) {
      console.error(`[Vite API] Migration failed for ${id}:`, e)
    }
  }

  // 分割ファイルから読み込み
  function readProjectSplit(id) {
    const projDir = path.join(projectsDir, id)
    const metaFile = path.join(projDir, 'meta.json')
    if (!fs.existsSync(metaFile)) return null
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
      const project = { ...meta }
      for (const key of DATA_FILES) {
        const data = readJson(path.join(projDir, `${key}.json`))
        if (data !== undefined) project[key] = data
      }
      return project
    } catch {
      return null
    }
  }

  // 分割ファイルに保存
  function writeProjectSplit(project) {
    const projDir = path.join(projectsDir, project.id)
    ensureDir(projDir)
    const meta = {}
    for (const [k, v] of Object.entries(project)) {
      if (!DATA_FILES.includes(k)) meta[k] = v
    }
    writeJson(path.join(projDir, 'meta.json'), meta)
    for (const key of DATA_FILES) {
      if (project[key] !== undefined) {
        writeJson(path.join(projDir, `${key}.json`), project[key])
      }
    }
  }

  function parseBody(req) {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', c => body += c)
      req.on('end', () => resolve(JSON.parse(body)))
    })
  }

  return {
    name: 'project-api',
    configureServer(server) {
      // プロジェクト一覧
      server.middlewares.use('/api/projects', (req, res, next) => {
        if (req.method !== 'GET') return next()
        ensureDir()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(readIndex()))
      })

      // プロジェクト取得（旧形式は自動マイグレーション）
      server.middlewares.use('/api/project-get', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { id } = await parseBody(req)
        ensureDir()
        migrateToSplit(id)
        const project = readProjectSplit(id)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(project))
      })

      // プロジェクト保存
      server.middlewares.use('/api/project-save', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const project = await parseBody(req)
        ensureDir()
        writeProjectSplit(project)
        // インデックス更新
        const index = readIndex()
        const meta = {
          id: project.id, name: project.name, description: project.description || '',
          gameType: project.gameType || 'novel', createdAt: project.createdAt, updatedAt: project.updatedAt,
          scriptLength: project.script?.length || 0, mapCount: project.maps?.length || 0,
          minigameCount: project.minigames?.length || 0,
        }
        const idx = index.findIndex(p => p.id === project.id)
        if (idx >= 0) index[idx] = meta; else index.push(meta)
        writeIndex(index)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      })

      // プロジェクト削除
      server.middlewares.use('/api/project-delete', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { id } = await parseBody(req)
        ensureDir()
        // ディレクトリ削除
        const projDir = path.join(projectsDir, id)
        if (fs.existsSync(projDir)) fs.rmSync(projDir, { recursive: true, force: true })
        // 旧形式ファイルも削除
        const oldFile = path.join(projectsDir, `${id}.json`)
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile)
        const index = readIndex().filter(p => p.id !== id)
        writeIndex(index)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), projectApiPlugin()],
  base: './',
  server: {
    port: 5555,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
