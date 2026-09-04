import { ipcMain, clipboard, screen } from 'electron'
import { getStore } from '../lib/store'
import { getBallWindow } from '../windows/ball'

export function registerSnippetsIpc() {
  ipcMain.handle('get-snippets', () => getStore().get('snippets'))

  ipcMain.handle('add-snippet', (_e, snippet) => {
    const store = getStore()
    const snippets = store.get('snippets')
    const newId = snippets.length > 0 ? Math.max(...snippets.map(s => s.id)) + 1 : 1
    snippets.push({ ...snippet, id: newId })
    store.set('snippets', snippets)
    return snippets
  })

  ipcMain.handle('update-snippet', (_e, snippet) => {
    const store = getStore()
    const snippets = store.get('snippets')
    const index = snippets.findIndex(s => s.id === snippet.id)
    if (index !== -1) {
      snippets[index] = snippet
      store.set('snippets', snippets)
    }
    return snippets
  })

  ipcMain.handle('delete-snippet', (_e, id) => {
    const store = getStore()
    const snippets = store.get('snippets').filter(s => s.id !== id)
    store.set('snippets', snippets)
    return snippets
  })

  ipcMain.handle('copy-to-clipboard', (_e, text) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('get-screen-size', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    return { width, height }
  })

  ipcMain.handle('get-window-position', () => {
    const ballWindow = getBallWindow()
    if (ballWindow) {
      const [x, y] = ballWindow.getPosition()
      return { x, y }
    }
    return { x: 0, y: 0 }
  })
}
