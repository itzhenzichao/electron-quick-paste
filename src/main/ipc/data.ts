import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { getStore } from '../lib/store'
import { getPanelWindow } from '../windows/panel'

interface BackupSnippet {
  id?: number
  content?: string
}

interface BackupData {
  version?: number
  exportedAt?: string
  snippets?: BackupSnippet[]
}

function formatDate() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

export function registerDataIpc() {
  ipcMain.handle('export-data', async () => {
    const store = getStore()
    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: store.get('snippets')
    }

    const result = await dialog.showSaveDialog({
      title: '导出 NianYiTuo 数据',
      defaultPath: `nianyituo-backup-${formatDate()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) return { ok: false, canceled: true }

    try {
      writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { ok: true, filePath: result.filePath }
    } catch (err) {
      return { ok: false, error: errMsg(err) }
    }
  })

  ipcMain.handle('import-data', async (_e, mode: 'merge' | 'replace') => {
    const result = await dialog.showOpenDialog({
      title: '导入 NianYiTuo 数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true }

    let data: BackupData
    try {
      data = JSON.parse(readFileSync(result.filePaths[0], 'utf-8'))
    } catch (err) {
      return { ok: false, error: '文件解析失败：' + errMsg(err) }
    }

    if (!data || !Array.isArray(data.snippets)) {
      return { ok: false, error: '文件格式不正确：缺少 snippets 字段' }
    }

    const store = getStore()
    let importedCount = 0

    if (mode === 'replace') {
      const cleanSnippets = data.snippets
        .filter((s): s is { content: string } => !!s && typeof s.content === 'string')
        .map((s, i) => ({ id: i + 1, content: s.content }))
      store.set('snippets', cleanSnippets)
      importedCount = cleanSnippets.length
    } else {
      const existing = store.get('snippets')
      const existingContents = new Set(existing.map(s => s.content))
      let nextId = existing.reduce((max, s) => Math.max(max, s.id), 0) + 1
      const appended: { id: number; content: string }[] = []
      for (const s of data.snippets) {
        if (!s || typeof s.content !== 'string') continue
        if (existingContents.has(s.content)) continue
        appended.push({ id: nextId++, content: s.content })
      }
      store.set('snippets', [...existing, ...appended])
      importedCount = appended.length
    }

    const panel = getPanelWindow()
    if (panel && !panel.isDestroyed()) {
      panel.webContents.send('refresh-snippets')
    }

    return { ok: true, count: importedCount, mode }
  })
}
