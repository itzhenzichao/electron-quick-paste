import { app, BrowserWindow, screen } from 'electron'
import path from 'path'
import { getStore } from '../lib/store'
import { findDisplayContainingPoint, findNearestDisplay } from '../lib/display'
import { getBallWindow, getBallSize } from './ball'

const PANEL_WIDTH = 340
const PANEL_HEIGHT = 480

let panelWindow: BrowserWindow | null = null

let dragPanelX = 0
let dragPanelY = 0
let dragPanelW = 0
let dragPanelH = 0
let springAnimId: NodeJS.Timeout | null = null

export function getPanelWindow() {
  return panelWindow
}

export function getPanelPosition() {
  const ballWindow = getBallWindow()
  const ballSize = getBallSize()
  if (!ballWindow || ballWindow.isDestroyed()) {
    const wa = screen.getPrimaryDisplay().workArea
    return { x: wa.x + wa.width - PANEL_WIDTH - 20, y: wa.y + 100, width: PANEL_WIDTH, height: PANEL_HEIGHT }
  }
  const [ballX, ballY] = ballWindow.getPosition()
  const bCenterX = ballX + ballSize / 2
  const bCenterY = ballY + ballSize / 2
  let display = findDisplayContainingPoint(bCenterX, bCenterY)
  if (!display) display = findNearestDisplay(bCenterX, bCenterY)
  const wa = display.workArea
  const gap = 8

  let panelY = ballY
  panelY = Math.max(wa.y, Math.min(panelY, wa.y + wa.height - PANEL_HEIGHT))

  let panelX
  if (ballX + ballSize + gap + PANEL_WIDTH <= wa.x + wa.width) {
    panelX = ballX + ballSize + gap
  } else if (ballX - gap - PANEL_WIDTH >= wa.x) {
    panelX = ballX - gap - PANEL_WIDTH
  } else {
    const rightSpace = wa.x + wa.width - (ballX + ballSize)
    const leftSpace = ballX - wa.x
    panelX = rightSpace > leftSpace ? wa.x + wa.width - PANEL_WIDTH : wa.x
  }

  return { x: panelX, y: panelY, width: PANEL_WIDTH, height: PANEL_HEIGHT }
}

export function createPanelWindow(): BrowserWindow {
  const pos = getPanelPosition()

  panelWindow = new BrowserWindow({
    width: pos.width,
    height: pos.height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    backgroundColor: '#2C2E36',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/panel.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    panelWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/panel/index.html')
  } else {
    panelWindow.loadFile(path.join(__dirname, '../renderer/panel/index.html'))
  }

  // if (!app.isPackaged) panelWindow.webContents.openDevTools({ mode: 'detach' })

  panelWindow.on('closed', () => {
    panelWindow = null
  })

  return panelWindow
}

export function dragPanelStart() {
  if (!panelWindow) return
  if (springAnimId) {
    clearTimeout(springAnimId)
    springAnimId = null
  }
  const [x, y] = panelWindow.getPosition()
  const [w, h] = panelWindow.getSize()
  dragPanelX = x
  dragPanelY = y
  dragPanelW = w
  dragPanelH = h
}

export function dragPanel(deltaX: number, deltaY: number) {
  if (!panelWindow) return
  dragPanelX += deltaX
  dragPanelY += deltaY

  const displays = screen.getAllDisplays()
  let vsLeft = Infinity, vsTop = Infinity, vsRight = -Infinity, vsBottom = -Infinity
  for (const d of displays) {
    if (d.bounds.x < vsLeft) vsLeft = d.bounds.x
    if (d.bounds.y < vsTop) vsTop = d.bounds.y
    if (d.bounds.x + d.bounds.width > vsRight) vsRight = d.bounds.x + d.bounds.width
    if (d.bounds.y + d.bounds.height > vsBottom) vsBottom = d.bounds.y + d.bounds.height
  }

  const centerX = dragPanelX + dragPanelW / 2
  const centerY = dragPanelY + dragPanelH / 2
  let display = findDisplayContainingPoint(centerX, centerY)
  if (!display) display = findNearestDisplay(centerX, centerY)
  const wa = display.workArea

  const clampX = Math.max(vsLeft, Math.max(wa.x - 50, Math.min(Math.round(dragPanelX), wa.x + wa.width - dragPanelW + 50)))
  const clampY = Math.max(vsTop, Math.max(wa.y - 50, Math.min(Math.round(dragPanelY), wa.y + wa.height - dragPanelH + 50)))

  panelWindow.setBounds({
    x: Math.min(clampX, vsRight - dragPanelW),
    y: Math.min(clampY, vsBottom - dragPanelH),
    width: dragPanelW,
    height: dragPanelH
  })
}

export function savePanelPosition() {
  if (!panelWindow) return

  const [realX, realY] = panelWindow.getPosition()
  const [w, h] = panelWindow.getSize()
  const centerX = realX + w / 2
  const centerY = realY + h / 2
  let display = findDisplayContainingPoint(centerX, centerY)
  if (!display) display = findNearestDisplay(centerX, centerY)
  const wa = display.workArea
  const snapDist = 10

  let targetX = Math.max(wa.x, Math.min(realX, wa.x + wa.width - w))
  let targetY = Math.max(wa.y, Math.min(realY, wa.y + wa.height - h))

  if (targetX - wa.x <= snapDist) targetX = wa.x
  else if (wa.x + wa.width - (targetX + w) <= snapDist) targetX = wa.x + wa.width - w
  if (targetY - wa.y <= snapDist) targetY = wa.y
  else if (wa.y + wa.height - (targetY + h) <= snapDist) targetY = wa.y + wa.height - h

  const startX = realX, startY = realY
  const endX = targetX, endY = targetY
  if (startX === endX && startY === endY) {
    dragPanelX = endX
    dragPanelY = endY
    getStore().set('panelPosition', { x: endX, y: endY })
    return
  }

  const duration = 250
  const totalFrames = 10
  let frame = 0
  function springStep() {
    if (!panelWindow || panelWindow.isDestroyed()) return
    frame++
    const t = frame / totalFrames
    const ease = 1 - Math.pow(1 - t, 3)
    const curX = Math.round(startX + (endX - startX) * ease)
    const curY = Math.round(startY + (endY - startY) * ease)
    panelWindow.setBounds({ x: curX, y: curY, width: w, height: h })
    if (frame < totalFrames) {
      springAnimId = setTimeout(springStep, duration / totalFrames)
    } else {
      springAnimId = null
      dragPanelX = endX
      dragPanelY = endY
      getStore().set('panelPosition', { x: endX, y: endY })
    }
  }
  springStep()
}

export function togglePanel() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    if (panelWindow.isVisible()) {
      panelWindow.hide()
    } else {
      const savedPos = getStore().get('panelPosition')
      if (savedPos.x !== null && savedPos.y !== null) {
        panelWindow.setPosition(savedPos.x, savedPos.y)
      } else {
        const pos = getPanelPosition()
        panelWindow.setPosition(pos.x, pos.y)
      }
      panelWindow.show()
      panelWindow.webContents.send('refresh-snippets')
    }
  } else {
    createPanelWindow()
  }
}

export function closePanel() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.hide()
  }
}

export function repositionPanelWindow() {
  if (!panelWindow || panelWindow.isDestroyed()) return
  const displays = screen.getAllDisplays()
  const [px, py] = panelWindow.getPosition()
  const [pw, ph] = panelWindow.getSize()
  const pCenterX = px + pw / 2
  const pCenterY = py + ph / 2
  const inAnyDisplay = displays.some(d =>
    pCenterX >= d.bounds.x && pCenterX < d.bounds.x + d.bounds.width &&
    pCenterY >= d.bounds.y && pCenterY < d.bounds.y + d.bounds.height
  )
  if (!inAnyDisplay) {
    const wa = screen.getPrimaryDisplay().workArea
    const nx = wa.x + Math.round((wa.width - pw) / 2)
    const ny = wa.y + Math.round((wa.height - ph) / 2)
    panelWindow.setPosition(nx, ny)
    getStore().set('panelPosition', { x: nx, y: ny })
  }
}
