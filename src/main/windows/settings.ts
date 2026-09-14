import { app, BrowserWindow, screen } from 'electron'
import path from 'path'

const SETTINGS_WIDTH = 480
const SETTINGS_HEIGHT = 560

let settingsWindow: BrowserWindow | null = null

export function getSettingsWindow() {
  return settingsWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  const primary = screen.getPrimaryDisplay()
  const x = Math.round(primary.workArea.x + (primary.workArea.width - SETTINGS_WIDTH) / 2)
  const y = Math.round(primary.workArea.y + (primary.workArea.height - SETTINGS_HEIGHT) / 2)

  settingsWindow = new BrowserWindow({
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    x,
    y,
    frame: false,
    transparent: false,
    alwaysOnTop: false,
    resizable: false,
    skipTaskbar: false,
    maximizable: false,
    minimizable: false,
    hasShadow: true,
    backgroundColor: '#2C2E36',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/settings.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/settings/index.html')
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/index.html'))
  }

  // if (!app.isPackaged) settingsWindow.webContents.openDevTools({ mode: 'detach' })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

export function closeSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
  }
}
