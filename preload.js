const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSnippets: () => ipcRenderer.invoke('get-snippets'),
  addSnippet: (snippet) => ipcRenderer.invoke('add-snippet', snippet),
  updateSnippet: (snippet) => ipcRenderer.invoke('update-snippet', snippet),
  deleteSnippet: (id) => ipcRenderer.invoke('delete-snippet', id),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  isPanelVisible: () => ipcRenderer.invoke('is-panel-visible'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragBall: (pos) => ipcRenderer.send('drag-ball', pos),
  saveBallPosition: () => ipcRenderer.send('save-ball-position'),
  dragPanelStart: () => ipcRenderer.send('drag-panel-start'),
  dragPanel: (delta) => ipcRenderer.send('drag-panel', delta),
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  closePanel: () => ipcRenderer.send('close-panel'),
  pauseJump: () => ipcRenderer.send('pause-jump'),
  resumeJump: () => ipcRenderer.send('resume-jump'),
  onJumpScale: (callback) => ipcRenderer.on('jump-scale', (event, data) => callback(data)),
  quitApp: () => ipcRenderer.send('quit-app')
});
