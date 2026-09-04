import { ipcMain } from 'electron'
import {
  getBallWindow, getBallSize, animateBallRebound,
  startJumpInterval, stopJumpInterval
} from '../windows/ball'
import {
  dragPanelStart, dragPanel, savePanelPosition,
  togglePanel, closePanel
} from '../windows/panel'
import { getStore } from '../lib/store'
import { findDisplayContainingPoint, findNearestDisplay } from '../lib/display'

export function registerWindowDragIpc() {
  ipcMain.handle('drag-start', () => {
    const ballWindow = getBallWindow()
    if (ballWindow) {
      const [x, y] = ballWindow.getPosition()
      return { x, y }
    }
    return { x: 0, y: 0 }
  })

  ipcMain.on('drag-ball', (_e, { x, y }) => {
    const ballWindow = getBallWindow()
    if (!ballWindow) return
    const BALL_SIZE = getBallSize()
    const rx = Math.round(x) || 0
    const ry = Math.round(y) || 0
    ballWindow.setBounds({ x: rx, y: ry, width: BALL_SIZE, height: BALL_SIZE })
  })

  ipcMain.on('save-ball-position', () => {
    const ballWindow = getBallWindow()
    if (!ballWindow || ballWindow.isDestroyed()) return
    const BALL_SIZE = getBallSize()

    const [realX, realY] = ballWindow.getPosition()
    if (!Number.isFinite(realX) || !Number.isFinite(realY)) return

    const ballCenterX = realX + BALL_SIZE / 2
    const ballCenterY = realY + BALL_SIZE / 2

    let display = findDisplayContainingPoint(ballCenterX, ballCenterY)
    if (!display) display = findNearestDisplay(ballCenterX, ballCenterY)
    if (!display) return
    const wa = display.workArea
    const snapDist = BALL_SIZE / 2 + 5

    let targetX = Math.max(wa.x, Math.min(realX, wa.x + wa.width - BALL_SIZE))
    let targetY = Math.max(wa.y, Math.min(realY, wa.y + wa.height - BALL_SIZE))

    if (targetX - wa.x <= snapDist) targetX = wa.x
    else if (wa.x + wa.width - (targetX + BALL_SIZE) <= snapDist) targetX = wa.x + wa.width - BALL_SIZE
    if (targetY - wa.y <= snapDist) targetY = wa.y
    else if (wa.y + wa.height - (targetY + BALL_SIZE) <= snapDist) targetY = wa.y + wa.height - BALL_SIZE

    if (targetX !== realX || targetY !== realY) {
      animateBallRebound(realX, realY, targetX, targetY)
    }

    getStore().set('ballPosition', { x: targetX, y: targetY })
  })

  ipcMain.on('drag-panel-start', () => dragPanelStart())
  ipcMain.on('drag-panel', (_e, delta) => dragPanel(delta.deltaX, delta.deltaY))
  ipcMain.on('save-panel-position', () => savePanelPosition())
  ipcMain.on('toggle-panel', () => togglePanel())
  ipcMain.on('close-panel', () => closePanel())
  ipcMain.on('pause-jump', () => stopJumpInterval())
  ipcMain.on('resume-jump', () => startJumpInterval())
}
