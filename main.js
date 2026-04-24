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

// ✅ 获取基础路径（兼容开发和打包环境）
function getBasePath() {
  return __dirname;
}

// ✅ 获取图标路径
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

function createBallWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedPos = store.get('ballPosition');
  const defaultX = savedPos.x || width - 80;
  const defaultY = savedPos.y || 100;

  const basePath = getBasePath();
  const iconPath = getIconPath();
  
  ballWindow = new BrowserWindow({
    width: 54,
    height: 54,
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
      // ✅ 修复：打包后使用 preload.min.js
      preload: path.join(basePath, 'preload.min.js'),
      transparent: true
    }
  });

  // ✅ 修复：使用完整路径
  ballWindow.loadFile(path.join(basePath, 'ball.html'));
  
  ballWindow.on('closed', () => {
    ballWindow = null;
    if (jumpInterval) {
      clearInterval(jumpInterval);
      jumpInterval = null;
    }
  });
  
  startJumpInterval();
}

// 窗口跳跃动画
function doWindowJump() {
  if (!ballWindow || ballWindow.isDestroyed() || isJumping) return;
  
  isJumping = true;
  const [startX, startY] = ballWindow.getPosition();
  const jumpHeight = 25;
  const duration = 600;
  const fps = 60;
  const frames = Math.floor(duration / 1000 * fps);
  let frame = 0;
  
  function animate() {
    if (!ballWindow || ballWindow.isDestroyed()) {
      isJumping = false;
      return;
    }
    
    frame++;
    const progress = frame / frames;
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
    ballWindow.setPosition(startX, Math.round(Math.max(0, startY - offsetY)));
    
    if (frame < frames) {
      setTimeout(animate, 1000 / fps);
    } else {
      ballWindow.setPosition(startX, startY);
      ballWindow.webContents.send('jump-scale', { scaleX: 1, scaleY: 1 });
      isJumping = false;
    }
  }
  
  animate();
}

function startJumpInterval() {
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
  
  let panelX = ballX + 60;
  let panelY = ballY - 50;
  
  if (panelX + panelWidth > width) {
    panelX = ballX - panelWidth - 10;
  }
  
  panelX = Math.max(0, Math.min(panelX, width - panelWidth));
  panelY = Math.max(0, Math.min(panelY, height - panelHeight));

  const basePath = getBasePath();

  panelWindow = new BrowserWindow({
    width: panelWidth,
    height: panelHeight,
    x: panelX,
    y: panelY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // ✅ 修复
      preload: path.join(basePath, 'preload.min.js')
    }
  });

  // ✅ 修复
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

ipcMain.on('drag-ball', (event, { deltaX, deltaY }) => {
  if (ballWindow) {
    const [x, y] = ballWindow.getPosition();
    const [w, h] = ballWindow.getSize();
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    ballWindow.setPosition(
      Math.max(0, Math.min(x + deltaX, width - w)),
      Math.max(0, Math.min(y + deltaY, height - h))
    );
  }
});

ipcMain.on('save-ball-position', () => {
  if (ballWindow) {
    const [x, y] = ballWindow.getPosition();
    store.set('ballPosition', { x, y });
  }
});

ipcMain.on('drag-panel', (event, { deltaX, deltaY }) => {
  if (panelWindow) {
    const [x, y] = panelWindow.getPosition();
    const [w, h] = panelWindow.getSize();
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    panelWindow.setPosition(
      Math.max(0, Math.min(x + deltaX, width - w)),
      Math.max(0, Math.min(y + deltaY, height - h))
    );
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