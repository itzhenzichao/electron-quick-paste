import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => process.platform,
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  closeSettings: () => ipcRenderer.send('close-settings'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (mode: 'merge' | 'replace') => ipcRenderer.invoke('import-data', mode)
})
