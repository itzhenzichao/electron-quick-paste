import { app, BrowserWindow, screen } from 'electron'
import { registerIpcHandlers } from './ipc'
import { createTray } from './tray'
import { createBallWindow, getBallWindow, repositionBallWindow } from './windows/ball'
import {
  createPanelWindow, getPanelWindow, repositionPanelWindow
} from './windows/panel'

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('force-device-scale-factor', '1')
}
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

let repositionDebounceId: NodeJS.Timeout | null = null
function repositionAll() {
  if (repositionDebounceId) {
    clearTimeout(repositionDebounceId)
  }
  repositionDebounceId = setTimeout(() => {
    repositionDebounceId = null
    repositionBallWindow()
    repositionPanelWindow()
  }, 200)
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const panel = getPanelWindow()
    if (panel && !panel.isDestroyed()) {
      if (!panel.isVisible()) panel.show()
      panel.webContents.send('refresh-snippets')
    } else {
      createPanelWindow()
    }
  })

  app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      app.dock.hide()
    }
    registerIpcHandlers()
    createTray()
    createBallWindow()

    screen.on('display-added', () => repositionAll())
    screen.on('display-removed', () => repositionAll())
    screen.on('display-metrics-changed', () => repositionAll())

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createBallWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    // 托盘常驻，不退出
  })
}
