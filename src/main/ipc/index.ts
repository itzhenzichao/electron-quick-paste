import { ipcMain } from 'electron'
import { registerSnippetsIpc } from './snippets'
import { registerWindowDragIpc } from './window-drag'
import { registerAutoLaunchIpc } from './auto-launch'
import { registerSettingsIpc } from './settings'
import { registerDataIpc } from './data'
import { quitApp } from '../tray'

export function registerIpcHandlers() {
  registerSnippetsIpc()
  registerWindowDragIpc()
  registerAutoLaunchIpc()
  registerSettingsIpc()
  registerDataIpc()

  ipcMain.on('tray-quit', () => quitApp())
  ipcMain.on('quit-app', () => quitApp())
}
