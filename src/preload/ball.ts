import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => process.platform,
  dragStart: () => ipcRenderer.invoke('drag-start'),
  dragBall: (pos) => ipcRenderer.send('drag-ball', pos),
  saveBallPosition: () => ipcRenderer.send('save-ball-position'),
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  pauseJump: () => ipcRenderer.send('pause-jump'),
  resumeJump: () => ipcRenderer.send('resume-jump'),
  onJumpScale: (callback) => ipcRenderer.on('jump-scale', (_e, data) => callback(data)),
  onRefreshSnippets: (callback) => ipcRenderer.on('refresh-snippets', () => callback())
})
