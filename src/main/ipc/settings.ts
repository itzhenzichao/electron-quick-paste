import { ipcMain } from 'electron'
import { createSettingsWindow, closeSettingsWindow } from '../windows/settings'

export function registerSettingsIpc() {
  ipcMain.on('open-settings', () => {
    createSettingsWindow()
  })
  ipcMain.on('close-settings', () => {
    closeSettingsWindow()
  })
}
