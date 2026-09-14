import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { getPanelWindow } from './windows/panel'
import { getBallWindow, stopJumpInterval } from './windows/ball'

let tray: Tray | null = null
let trayMenuWin: BrowserWindow | null = null

export function getTray() {
  return tray
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function destroyTrayMenuWin() {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) {
    trayMenuWin.close()
    trayMenuWin = null
  }
}

export function createTray() {
  const trayIconPath = process.platform === 'darwin'
    ? path.join(app.getAppPath(), 'build', 'tray-icon.png')
    : path.join(app.getAppPath(), 'build', 'icon.png')
  if (!fs.existsSync(trayIconPath)) return

  let trayIcon = nativeImage.createFromPath(trayIconPath)

  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 22, height: 22 })
    trayIcon.setTemplateImage(true)
  } else {
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  }
  tray = new Tray(trayIcon)
  tray.setToolTip('NianYiTuo')

  if (process.platform === 'darwin') {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '退出',
        click: () => quitApp()
      }
    ])
    tray.setContextMenu(contextMenu)
  } else {
    // 每次右键现建窗口+加载页面会很慢，启动时创建一次常驻隐藏，右键只定位并显示
    trayMenuWin = createTrayMenuWin()
    tray.on('right-click', () => showTrayMenu())
  }
}

function createTrayMenuWin() {
  const win = new BrowserWindow({
    width: 50, height: 26,
    show: false,
    frame: false, alwaysOnTop: true,
    resizable: false, skipTaskbar: true,
    backgroundColor: '#4A4A4A',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  })

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{width:50px;height:26px;overflow:hidden;font-family:"Microsoft YaHei",sans-serif;border-radius:4px}' +
    '.item{width:100%;height:100%;display:flex;align-items:center;justify-content:center;' +
    'font-size:13px;color:#fff;cursor:pointer}' +
    '.item:hover{background:#667eea}' +
    '</style></head><body><div class="item" id="btn">退出</div><script>' +
    'const{ipcRenderer}=require("electron");' +
    'document.getElementById("btn").onclick=function(){ipcRenderer.send("tray-quit")}' +
    '</script></body></html>'
  ))

  win.on('blur', () => {
    if (trayMenuWin && !trayMenuWin.isDestroyed()) {
      trayMenuWin.hide()
    }
  })

  win.on('closed', () => {
    if (trayMenuWin === win) trayMenuWin = null
  })

  return win
}

function showTrayMenu() {
  if (!tray) return
  if (!trayMenuWin || trayMenuWin.isDestroyed()) {
    trayMenuWin = createTrayMenuWin()
  }
  const trayBounds = tray.getBounds()
  const mw = 50, mh = 26
  const mx = Math.round(trayBounds.x - (mw - trayBounds.width) / 2)
  const my = trayBounds.y - mh - 4
  trayMenuWin.setBounds({ x: mx, y: my, width: mw, height: mh })
  trayMenuWin.show()
}

export function quitApp() {
  destroyTrayMenuWin()
  stopJumpInterval()
  destroyTray()
  const panel = getPanelWindow()
  if (panel && !panel.isDestroyed()) panel.destroy()
  const ball = getBallWindow()
  if (ball && !ball.isDestroyed()) ball.destroy()
  app.quit()
}
