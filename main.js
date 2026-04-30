const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store({
  name: 'quick-paste-data',
  defaults: {
    snippets: [
      { id: 1, content: '粘贴一下吧！' },
    ],
    ballPosition: { x: null, y: null }
  }
});

function getBasePath() {
  return __dirname;
}

function getIconPath() {
  const basePath = getBasePath();
  if (process.platform === 'win32') {
    return path.join(basePath, 'build', 'icon.ico');
  }
  return path.join(basePath, 'build', 'icon.png');
}

let ballWindow = null;
let panelWindow = null;
let jumpInterval = null;
let isJumping = false;

// ✅ 拖拽时主进程自己维护窗口位置，避免 getPosition() 异步滞后的漂移问题
let dragPosX = 0;
let dragPosY = 0;
let dragPanelX = 0;
let dragPanelY = 0;
let dragPanelW = 0;
let dragPanelH = 0;

const BALL_SIZE = 54;

function createBallWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const savedPos = store.get('ballPosition');
  const defaultX = savedPos.x !== null ? savedPos.x : width - 80;
  const defaultY = savedPos.y !== null ? savedPos.y : 100;

  const basePath = getBasePath();
  const iconPath = getIconPath();
  
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
      preload: path.join(basePath, 'preload.min.js')
    }
  });

  ballWindow.loadFile(path.join(basePath, 'ball.html'));
  
  ballWindow.on('closed', () => {
    ballWindow = null;
    if (jumpInterval) {
      clearInterval(jumpInterval);
      jumpInterval = null;
    }
  });
  
  // ✅ 跳跃动画仅在 macOS 上启用
  if (process.platform === 'darwin') {
    startJumpInterval();
  }
}

function doWindowJump() {
  if (!ballWindow || ballWindow.isDestroyed() || isJumping) return;

  isJumping = true;
  const [startX, startY] = ballWindow.getPosition();
  const jumpStartX = startX;
  const jumpStartY = startY;

  const jumpHeight = 25;
  const duration = 600;
  const fps = 60;
  const totalFrames = Math.floor(duration / 1000 * fps);
  let frame = 0;

  function animate() {
    if (!ballWindow || ballWindow.isDestroyed()) {
      isJumping = false;
      return;
    }

    frame++;
    const progress = frame / totalFrames;
    const t = progress;
    const offsetY = -4 * t * (t - 1) * jumpHeight;

    let scaleX = 1;
    let scaleY = 1;

    if (progress < 0.3) {
      scaleY = 1 + progress * 0.3;
      scaleX = 1 - progress * 0.1;
    } else if (progress < 0.6) {
      scaleY = 1.05;
      scaleX = 0.98;
    } else if (progress < 0.8) {
      const landProgress = (progress - 0.6) / 0.2;
      scaleY = 1.05 - landProgress * 0.2;
      scaleX = 0.98 + landProgress * 0.08;
    } else {
      const recoverProgress = (progress - 0.8) / 0.2;
      scaleY = 0.85 + recoverProgress * 0.15;
      scaleX = 1.06 - recoverProgress * 0.06;
    }

    ballWindow.webContents.send('jump-scale', { scaleX, scaleY });
    const newY = Math.round(jumpStartY - offsetY);
    ballWindow.setPosition(jumpStartX, newY);

    if (frame < totalFrames) {
      setTimeout(animate, 1000 / fps);
    } else {
      ballWindow.setPosition(jumpStartX, jumpStartY);
      ballWindow.webContents.send('jump-scale', { scaleX: 1, scaleY: 1 });
      isJumping = false;
      // 跳跃结束后同步 dragPos，防止与真实窗口位置产生漂移
      const [realX, realY] = ballWindow.getPosition();
      dragPosX = realX;
      dragPosY = realY;
    }
  }

  animate();
}

function startJumpInterval() {
  // ✅ 跳跃动画仅在 macOS 上启用
  if (process.platform !== 'darwin') return;
  if (jumpInterval) clearInterval(jumpInterval);
  jumpInterval = setInterval(doWindowJump, 5000);
}

function stopJumpInterval() {
  if (jumpInterval) {
    clearInterval(jumpInterval);
    jumpInterval = null;
  }
}

function createPanelWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const [ballX, ballY] = ballWindow.getPosition();

  const panelWidth = 340;
  const panelHeight = 480;
  const gap = 8;

  // 垂直：面板上边缘与球上边缘对齐，再限制不超出屏幕
  let panelY = ballY;
  panelY = Math.max(0, Math.min(panelY, height - panelHeight));

  // 水平：优先右侧，其次左侧，都不够时选空间更大的一侧
  let panelX;
  if (ballX + BALL_SIZE + gap + panelWidth <= width) {
    panelX = ballX + BALL_SIZE + gap;
  } else if (ballX - gap - panelWidth >= 0) {
    panelX = ballX - gap - panelWidth;
  } else {
    // 两侧都不够单独显示，选剩余空间更大的一侧紧贴屏幕边缘
    const rightSpace = width - (ballX + BALL_SIZE);
    const leftSpace = ballX;
    panelX = rightSpace > leftSpace ? width - panelWidth : 0;
  }

  const basePath = getBasePath();

  panelWindow = new BrowserWindow({
    width: panelWidth,
    height: panelHeight,
    x: panelX,
    y: panelY,
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
      preload: path.join(basePath, 'preload.min.js')
    }
  });

  panelWindow.loadFile(path.join(basePath, 'panel.html'));
  
  panelWindow.on('closed', () => {
    panelWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const dockIconPath = path.join(getBasePath(), 'build', 'icon.png');
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath);
    }
  }
  createBallWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createBallWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-snippets', () => store.get('snippets'));

ipcMain.handle('add-snippet', (event, snippet) => {
  const snippets = store.get('snippets');
  const newId = snippets.length > 0 ? Math.max(...snippets.map(s => s.id)) + 1 : 1;
  snippets.push({ ...snippet, id: newId });
  store.set('snippets', snippets);
  return snippets;
});

ipcMain.handle('update-snippet', (event, snippet) => {
  const snippets = store.get('snippets');
  const index = snippets.findIndex(s => s.id === snippet.id);
  if (index !== -1) {
    snippets[index] = snippet;
    store.set('snippets', snippets);
  }
  return snippets;
});

ipcMain.handle('delete-snippet', (event, id) => {
  const snippets = store.get('snippets').filter(s => s.id !== id);
  store.set('snippets', snippets);
  return snippets;
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('get-screen-size', () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

ipcMain.handle('is-panel-visible', () => {
  return panelWindow !== null && !panelWindow.isDestroyed();
});

// ✅ 新增：获取窗口位置
ipcMain.handle('get-window-position', () => {
  if (ballWindow) {
    const [x, y] = ballWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

// ✅ 拖拽开始时记录窗口当前位置作为增量累加的基准
ipcMain.on('drag-start', () => {
  if (ballWindow) {
    const [x, y] = ballWindow.getPosition();
    dragPosX = x;
    dragPosY = y;
  }
});

// ✅ 拖拽期间不限位置，可随意拖动到屏幕任何位置（含屏幕外）
ipcMain.on('drag-ball', (event, { deltaX, deltaY }) => {
  if (ballWindow) {
    dragPosX += deltaX;
    dragPosY += deltaY;
    ballWindow.setPosition(Math.round(dragPosX), Math.round(dragPosY));
  }
});

// ✅ 松手后用 getPosition() 获取真实窗口位置进行吸边，消除增量累加的漂移
ipcMain.on('save-ball-position', () => {
  if (ballWindow) {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;

    const [realX, realY] = ballWindow.getPosition();
    const snappedX = Math.max(0, Math.min(realX, width - BALL_SIZE));
    const snappedY = Math.max(0, Math.min(realY, height - BALL_SIZE));

    if (snappedX !== realX || snappedY !== realY) {
      ballWindow.setPosition(snappedX, snappedY);
    }

    // 用真实窗口位置同步 dragPos，消除累积漂移
    const [finalX, finalY] = ballWindow.getPosition();
    dragPosX = finalX;
    dragPosY = finalY;

    store.set('ballPosition', { x: dragPosX, y: dragPosY });
  }
});

// ✅ 面板拖拽开始时记录窗口当前位置和尺寸，避免 getPosition() 异步滞后漂移及 DPI 缩放导致尺寸变化
ipcMain.on('drag-panel-start', () => {
  if (panelWindow) {
    const [x, y] = panelWindow.getPosition();
    const [w, h] = panelWindow.getSize();
    dragPanelX = x;
    dragPanelY = y;
    dragPanelW = w;
    dragPanelH = h;
  }
});

ipcMain.on('drag-panel', (event, { deltaX, deltaY }) => {
  if (panelWindow) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    dragPanelX += deltaX;
    dragPanelY += deltaY;
    // ✅ 使用 setBounds 显式指定宽高，防止 Windows DPI 缩放下 setPosition 导致窗口尺寸漂移变大
    panelWindow.setBounds({
      x: Math.max(0, Math.min(Math.round(dragPanelX), width - dragPanelW)),
      y: Math.max(0, Math.min(Math.round(dragPanelY), height - dragPanelH)),
      width: dragPanelW,
      height: dragPanelH
    });
  }
});

ipcMain.on('toggle-panel', () => {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.close();
    panelWindow = null;
  } else {
    createPanelWindow();
  }
});

ipcMain.on('close-panel', () => {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.close();
    panelWindow = null;
  }
});

ipcMain.on('pause-jump', () => stopJumpInterval());
ipcMain.on('resume-jump', () => startJumpInterval());

ipcMain.on('quit-app', () => {
  stopJumpInterval();
  app.quit();
});
