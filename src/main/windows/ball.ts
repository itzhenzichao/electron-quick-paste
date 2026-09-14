import { app, BrowserWindow, screen } from 'electron'
import path from 'path'
import { getStore } from '../lib/store'
import { findDisplayContainingPoint } from '../lib/display'

const BALL_SIZE = 54

let ballWindow: BrowserWindow | null = null
let jumpInterval: NodeJS.Timeout | null = null
let isJumping = false
let ballReboundAnimId: NodeJS.Timeout | null = null

export function getBallWindow() {
  return ballWindow
}

export function getBallSize() {
  return BALL_SIZE
}

function getIconPath() {
  if (process.platform === 'win32') {
    return path.join(app.getAppPath(), 'build', 'icon.ico')
  }
  return path.join(app.getAppPath(), 'build', 'icon.png')
}

export function createBallWindow(): BrowserWindow {
  const store = getStore()
  const displays = screen.getAllDisplays()
  const wa = screen.getPrimaryDisplay().workArea
  const savedPos = store.get('ballPosition')

  let defaultX = wa.x + wa.width - 80
  let defaultY = wa.y + 100
  if (savedPos.x !== null && savedPos.y !== null) {
    const scx = savedPos.x + BALL_SIZE / 2
    const scy = savedPos.y + BALL_SIZE / 2
    const onScreen = displays.some(d =>
      scx >= d.bounds.x && scx < d.bounds.x + d.bounds.width &&
      scy >= d.bounds.y && scy < d.bounds.y + d.bounds.height
    )
    if (onScreen) {
      defaultX = savedPos.x
      defaultY = savedPos.y
    }
  }

  const iconPath = getIconPath()
  const fs = require('fs')

  ballWindow = new BrowserWindow({
    width: BALL_SIZE,
    height: BALL_SIZE,
    x: defaultX,
    y: defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/ball.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    ballWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/ball/index.html')
  } else {
    ballWindow.loadFile(path.join(__dirname, '../renderer/ball/index.html'))
  }

  if (!app.isPackaged) ballWindow.webContents.openDevTools({ mode: 'detach' })

  ballWindow.on('closed', () => {
    ballWindow = null
    if (jumpInterval) {
      clearInterval(jumpInterval)
      jumpInterval = null
    }
  })

  if (process.platform === 'darwin') {
    startJumpInterval()
  }

  return ballWindow
}

function doWindowJump() {
  if (!ballWindow || ballWindow.isDestroyed() || isJumping) return

  isJumping = true
  const [startX, startY] = ballWindow.getPosition()
  const jumpStartX = startX
  const jumpStartY = startY

  const jumpHeight = 25
  const duration = 600
  const fps = 60
  const totalFrames = Math.floor(duration / 1000 * fps)
  let frame = 0

  function animate() {
    if (!ballWindow || ballWindow.isDestroyed()) {
      isJumping = false
      return
    }

    frame++
    const progress = frame / totalFrames
    const t = progress
    const offsetY = -4 * t * (t - 1) * jumpHeight

    let scaleX = 1
    let scaleY = 1

    if (progress < 0.3) {
      scaleY = 1 + progress * 0.3
      scaleX = 1 - progress * 0.1
    } else if (progress < 0.6) {
      scaleY = 1.05
      scaleX = 0.98
    } else if (progress < 0.8) {
      const landProgress = (progress - 0.6) / 0.2
      scaleY = 1.05 - landProgress * 0.2
      scaleX = 0.98 + landProgress * 0.08
    } else {
      const recoverProgress = (progress - 0.8) / 0.2
      scaleY = 0.85 + recoverProgress * 0.15
      scaleX = 1.06 - recoverProgress * 0.06
    }

    ballWindow.webContents.send('jump-scale', { scaleX, scaleY })
    const newY = Math.round(jumpStartY - offsetY)
    ballWindow.setBounds({ x: jumpStartX, y: newY, width: BALL_SIZE, height: BALL_SIZE })

    if (frame < totalFrames) {
      setTimeout(animate, 1000 / fps)
    } else {
      ballWindow.setBounds({ x: jumpStartX, y: jumpStartY, width: BALL_SIZE, height: BALL_SIZE })
      ballWindow.webContents.send('jump-scale', { scaleX: 1, scaleY: 1 })
      isJumping = false
    }
  }

  animate()
}

export function startJumpInterval() {
  if (process.platform !== 'darwin') return
  if (jumpInterval) clearInterval(jumpInterval)
  jumpInterval = setInterval(doWindowJump, 5000)
}

export function stopJumpInterval() {
  if (jumpInterval) {
    clearInterval(jumpInterval)
    jumpInterval = null
  }
}

export function animateBallRebound(fromX: number, fromY: number, toX: number, toY: number) {
  if (!Number.isFinite(fromX) || !Number.isFinite(fromY) ||
      !Number.isFinite(toX) || !Number.isFinite(toY)) return

  if (ballReboundAnimId) {
    clearTimeout(ballReboundAnimId)
    ballReboundAnimId = null
  }

  const duration = 250
  const totalFrames = 10
  let frame = 0

  function step() {
    if (!ballWindow || ballWindow.isDestroyed()) {
      ballReboundAnimId = null
      return
    }
    frame++
    const t = frame / totalFrames
    const ease = 1 - Math.pow(1 - t, 3)
    const curX = Math.round(fromX + (toX - fromX) * ease) || 0
    const curY = Math.round(fromY + (toY - fromY) * ease) || 0

    if (!Number.isFinite(curX) || !Number.isFinite(curY)) {
      ballReboundAnimId = null
      return
    }

    ballWindow.setBounds({ x: curX, y: curY, width: BALL_SIZE, height: BALL_SIZE })

    if (frame < totalFrames) {
      ballReboundAnimId = setTimeout(step, duration / totalFrames)
    } else {
      ballReboundAnimId = null
    }
  }
  step()
}

export function repositionBallWindow() {
  if (!ballWindow || ballWindow.isDestroyed()) return
  const displays = screen.getAllDisplays()
  const [bx, by] = ballWindow.getPosition()
  const bCenterX = bx + BALL_SIZE / 2
  const bCenterY = by + BALL_SIZE / 2
  const inAnyDisplay = displays.some(d =>
    bCenterX >= d.bounds.x && bCenterX < d.bounds.x + d.bounds.width &&
    bCenterY >= d.bounds.y && bCenterY < d.bounds.y + d.bounds.height
  )
  if (!inAnyDisplay) {
    const wa = screen.getPrimaryDisplay().workArea
    const rx = wa.x + wa.width - 80
    const ry = wa.y + 100
    ballWindow.setBounds({ x: rx, y: ry, width: BALL_SIZE, height: BALL_SIZE })
    getStore().set('ballPosition', { x: rx, y: ry })
  }
}

export { findDisplayContainingPoint }
