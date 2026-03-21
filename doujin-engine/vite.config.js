import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'

// 開発サーバー用: data/projects へのファイル保存API（ジャンル別分割対応）
function projectApiPlugin() {
  const projectsDir = path.resolve(__dirname, 'data', 'projects')
  const DATA_FILES = ['script', 'characters', 'items', 'bgStyles', 'maps', 'customTiles', 'battleData', 'minigames', 'saves']

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

  function parseBody(req, maxSize = 1024 * 1024) {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', c => body += c)
      req.on('end', () => resolve(JSON.parse(body)))
    })
  }

  // base64 → Buffer 変換
  function parseBodyLarge(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch (e) { reject(e) }
      })
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

      // アセットアップロード（base64 JSON）
      server.middlewares.use('/api/asset-upload', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { projectId, type, filename, data } = await parseBodyLarge(req)
        if (!projectId || !type || !filename || !data) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'missing fields' }))
          return
        }
        const assetDir = path.join(projectsDir, projectId, 'assets', type)
        ensureDir(assetDir)
        const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        const filePath = path.join(assetDir, safeName)
        const buf = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64')
        fs.writeFileSync(filePath, buf)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, filename: safeName }))
      })

      // アセット一覧
      server.middlewares.use('/api/asset-list', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { projectId, type } = await parseBody(req)
        const assetDir = path.join(projectsDir, projectId, 'assets', type)
        let files = []
        if (fs.existsSync(assetDir)) {
          files = fs.readdirSync(assetDir).filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(files))
      })

      // アセット削除
      server.middlewares.use('/api/asset-delete', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { projectId, type, filename } = await parseBody(req)
        const filePath = path.join(projectsDir, projectId, 'assets', type, filename)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      })

      // アセット配信（/project-assets/{id}/{type}/{filename}）
      server.middlewares.use('/project-assets', (req, res, next) => {
        const parts = req.url.split('/').filter(Boolean)
        if (parts.length < 3) return next()
        const [id, type, ...rest] = parts
        const filename = rest.join('/')
        const filePath = path.join(projectsDir, id, 'assets', type, filename)
        if (!fs.existsSync(filePath)) { res.statusCode = 404; res.end(); return }
        const ext = path.extname(filename).toLowerCase()
        const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }
        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(filePath).pipe(res)
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

      // ビルド実行（SSE でリアルタイムストリーミング）
      server.middlewares.use('/api/build', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { mode, projectName } = await parseBody(req)
        const projectRoot = path.resolve(__dirname)
        const buildScript = path.join(projectRoot, 'build.sh')
        const safeName = projectName ? projectName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') : ''

        let cmd, args
        if (fs.existsSync(buildScript)) {
          cmd = 'bash'
          args = [buildScript, mode || 'web', ...(safeName ? [safeName] : [])]
        } else {
          cmd = 'npx'
          args = ['vite', 'build', ...(safeName ? ['--outDir', `dist/${safeName}`] : [])]
        }

        // SSE ヘッダー
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
        send({ type: 'info', text: `ビルド開始: ${mode}` })
        send({ type: 'cmd', text: `> ${cmd} ${args.join(' ')}` })

        const proc = execFile(cmd, args, {
          cwd: projectRoot,
          shell: true,
          env: { ...process.env, FORCE_COLOR: '0' },
        })
        proc.stdout.on('data', (d) => send({ type: 'stdout', text: d.toString() }))
        proc.stderr.on('data', (d) => send({ type: 'stderr', text: d.toString() }))
        proc.on('close', (code) => {
          send(code === 0
            ? { type: 'success', text: 'ビルド完了!' }
            : { type: 'error', text: `ビルド失敗 (exit code: ${code})` })
          res.end()
        })
        proc.on('error', (err) => {
          send({ type: 'error', text: `実行エラー: ${err.message}` })
          res.end()
        })
      })

      // ゲームエクスポート（プロジェクトデータ + アセットを public/ に書き出し）
      server.middlewares.use('/api/export-game', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const { projectId } = await parseBody(req)
        if (!projectId) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'projectId required' }))
          return
        }
        try {
          // プロジェクトデータ読み込み
          const project = readProjectSplit(projectId)
          if (!project) throw new Error('Project not found')

          const publicDir = path.resolve(__dirname, 'public')
          ensureDir(publicDir)

          // game-data.json を書き出し
          const gameData = {
            name: project.name,
            gameType: project.gameType || 'novel',
            script: project.script || [],
            characters: project.characters || {},
            bgStyles: project.bgStyles || {},
            maps: project.maps || [],
            customTiles: project.customTiles || [],
            battleData: project.battleData || {},
            minigames: project.minigames || [],
            cgCatalog: project.cgCatalog || [],
            sceneCatalog: project.sceneCatalog || [],
            saves: [null, null, null],
          }
          writeJson(path.join(publicDir, 'game-data.json'), gameData)

          // アセットをコピー
          const srcAssets = path.join(projectsDir, projectId, 'assets')
          const destAssets = path.join(publicDir, 'game-assets')
          if (fs.existsSync(srcAssets)) {
            copyDirSync(srcAssets, destAssets)
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
        } catch (e) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: e.message }))
        }
      })

      // ゲームエクスポートクリーンアップ
      server.middlewares.use('/api/export-game-cleanup', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        const publicDir = path.resolve(__dirname, 'public')
        const gameDataFile = path.join(publicDir, 'game-data.json')
        const gameAssetsDir = path.join(publicDir, 'game-assets')
        if (fs.existsSync(gameDataFile)) fs.unlinkSync(gameDataFile)
        if (fs.existsSync(gameAssetsDir)) fs.rmSync(gameAssetsDir, { recursive: true, force: true })
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      })
    }
  }
}

// ディレクトリ再帰コピー
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
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
