import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSnippets: () => ipcRenderer.invoke('get-snippets'),
  addSnippet: (snippet) => ipcRenderer.invoke('add-snippet', snippet),
  updateSnippet: (snippet) => ipcRenderer.invoke('update-snippet', snippet),
  deleteSnippet: (id) => ipcRenderer.invoke('delete-snippet', id),
  reorderSnippets: (ids) => ipcRenderer.invoke('reorder-snippets', ids),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getPlatform: () => process.platform,
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  dragStart: () => ipcRenderer.invoke('drag-start'),
  dragBall: (pos) => ipcRenderer.send('drag-ball', pos),
  saveBallPosition: () => ipcRenderer.send('save-ball-position'),
  dragPanelStart: () => ipcRenderer.send('drag-panel-start'),
  dragPanel: (delta) => ipcRenderer.send('drag-panel', delta),
  savePanelPosition: () => ipcRenderer.send('save-panel-position'),
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  closePanel: () => ipcRenderer.send('close-panel'),
  openSettings: () => ipcRenderer.send('open-settings'),
  quitApp: () => ipcRenderer.send('quit-app'),
  onJumpScale: (callback) => ipcRenderer.on('jump-scale', (_e, data) => callback(data)),
  onRefreshSnippets: (callback) => ipcRenderer.on('refresh-snippets', () => callback())
})
