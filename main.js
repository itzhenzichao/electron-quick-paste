const { app, BrowserWindow, ipcMain, clipboard, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store({
  name: 'quick-paste-data',
  defaults: {
    snippets: [
      { id: 1, content: '粘贴一下吧！' },
    ],
    ballPosition: { x: null, y: null },
    panelPosition: { x: null, y: null }
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
let tray = null;
let jumpInterval = null;
let isJumping = false;

let dragPanelX = 0;
let dragPanelY = 0;
let dragPanelW = 0;
let dragPanelH = 0;
let springAnimId = null;
let ballReboundAnimId = null;
let trayMenuWin = null;
let repositionDebounceId = null;

const BALL_SIZE = 54;

function createTray() {
  const basePath = getBasePath();
  // macOS: prefer template-ready tray icon; Windows: use main icon
  const trayIconPath = process.platform === 'darwin'
    ? path.join(basePath, 'build', 'tray-icon.png')
    : path.join(basePath, 'build', 'icon.png');
  if (!fs.existsSync(trayIconPath)) return;

  let trayIcon = nativeImage.createFromPath(trayIconPath);

  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 22, height: 22 });
    trayIcon.setTemplateImage(true);
  } else {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('NianYiTuo');

  if (process.platform === 'darwin') {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '退出',
        click: () => {
          tray.destroy();
          tray = null;
          stopJumpInterval();
          if (panelWindow && !panelWindow.isDestroyed()) panelWindow.destroy();
          if (ballWindow && !ballWindow.isDestroyed()) ballWindow.destroy();
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  } else {
    // Windows 用自定义紧凑弹窗替代原生菜单，无多余空白
    tray.on('right-click', () => {
      if (trayMenuWin && !trayMenuWin.isDestroyed()) {
        trayMenuWin.close();
        trayMenuWin = null;
      }
      const trayBounds = tray.getBounds();
      const mw = 50, mh = 26;
      const mx = Math.round(trayBounds.x - (mw - trayBounds.width) / 2);
      const my = trayBounds.y - mh - 4;

      trayMenuWin = new BrowserWindow({
        width: mw, height: mh,
        x: mx, y: my,
        frame: false, alwaysOnTop: true,
        resizable: false, skipTaskbar: true,
        backgroundColor: '#4A4A4A',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      });

      trayMenuWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
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
      ));

      trayMenuWin.on('blur', () => {
        if (trayMenuWin && !trayMenuWin.isDestroyed()) {
          trayMenuWin.close();
          trayMenuWin = null;
        }
      });

      trayMenuWin.on('closed', () => {
        trayMenuWin = null;
      });
    });
  }
}

function findDisplayContainingPoint(x, y) {
  const displays = screen.getAllDisplays();
  for (const d of displays) {
    if (x >= d.bounds.x && x < d.bounds.x + d.bounds.width &&
        y >= d.bounds.y && y < d.bounds.y + d.bounds.height) {
      return d;
    }
  }
  return null;
}

function findNearestDisplay(x, y) {
  const displays = screen.getAllDisplays();
  let nearest = displays[0];
  let minDist = Infinity;
  for (const d of displays) {
    const midX = d.bounds.x + d.bounds.width / 2;
    const midY = d.bounds.y + d.bounds.height / 2;
    const dist = (x - midX) ** 2 + (y - midY) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = d;
    }
  }
  return nearest;
}

function repositionAll() {
  if (repositionDebounceId) {
    clearTimeout(repositionDebounceId);
  }
  repositionDebounceId = setTimeout(() => {
    repositionDebounceId = null;
    doRepositionAll();
  }, 200);
}

function doRepositionAll() {
  const displays = screen.getAllDisplays();
  if (ballWindow && !ballWindow.isDestroyed()) {
    const [bx, by] = ballWindow.getPosition();
    const bCenterX = bx + BALL_SIZE / 2;
    const bCenterY = by + BALL_SIZE / 2;
    const inAnyDisplay = displays.some(d =>
      bCenterX >= d.bounds.x && bCenterX < d.bounds.x + d.bounds.width &&
      bCenterY >= d.bounds.y && bCenterY < d.bounds.y + d.bounds.height
    );
    if (!inAnyDisplay) {
      const wa = screen.getPrimaryDisplay().workArea;
      const rx = wa.x + wa.width - 80;
      const ry = wa.y + 100;
      ballWindow.setBounds({ x: rx, y: ry, width: BALL_SIZE, height: BALL_SIZE });
      store.set('ballPosition', { x: rx, y: ry });
    }
  }
  if (panelWindow && !panelWindow.isDestroyed()) {
    const [px, py] = panelWindow.getPosition();
    const [pw, ph] = panelWindow.getSize();
    const pCenterX = px + pw / 2;
    const pCenterY = py + ph / 2;
    const inAnyDisplay = displays.some(d =>
      pCenterX >= d.bounds.x && pCenterX < d.bounds.x + d.bounds.width &&
      pCenterY >= d.bounds.y && pCenterY < d.bounds.y + d.bounds.height
    );
    if (!inAnyDisplay) {
      const wa = screen.getPrimaryDisplay().workArea;
      panelWindow.setPosition(wa.x + Math.round((wa.width - pw) / 2), wa.y + Math.round((wa.height - ph) / 2));
      store.set('panelPosition', { x: wa.x + Math.round((wa.width - pw) / 2), y: wa.y + Math.round((wa.height - ph) / 2) });
    }
  }
}

function createBallWindow() {
  const displays = screen.getAllDisplays();
  const wa = screen.getPrimaryDisplay().workArea;
  const savedPos = store.get('ballPosition');

  let defaultX = wa.x + wa.width - 80;
  let defaultY = wa.y + 100;
  if (savedPos.x !== null && savedPos.y !== null) {
    const scx = savedPos.x + BALL_SIZE / 2;
    const scy = savedPos.y + BALL_SIZE / 2;
    const onScreen = displays.some(d =>
      scx >= d.bounds.x && scx < d.bounds.x + d.bounds.width &&
      scy >= d.bounds.y && scy < d.bounds.y + d.bounds.height
    );
    if (onScreen) {
      defaultX = savedPos.x;
      defaultY = savedPos.y;
    }
  }

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
  if (!app.isPackaged) ballWindow.webContents.openDevTools({ mode: 'detach' });

  ballWindow.on('closed', () => {
    ballWindow = null;
    if (jumpInterval) {
      clearInterval(jumpInterval);
      jumpInterval = null;
    }
    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.destroy();
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
    ballWindow.setBounds({ x: jumpStartX, y: newY, width: BALL_SIZE, height: BALL_SIZE });

    if (frame < totalFrames) {
      setTimeout(animate, 1000 / fps);
    } else {
      ballWindow.setBounds({ x: jumpStartX, y: jumpStartY, width: BALL_SIZE, height: BALL_SIZE });
      ballWindow.webContents.send('jump-scale', { scaleX: 1, scaleY: 1 });
      isJumping = false;
      // 跳跃结束后校验窗口位置
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

function getPanelPosition() {
  const panelWidth = 340;
  const panelHeight = 480;
  if (!ballWindow || ballWindow.isDestroyed()) {
    const wa = screen.getPrimaryDisplay().workArea;
    return { x: wa.x + wa.width - panelWidth - 20, y: wa.y + 100, width: panelWidth, height: panelHeight };
  }
  const [ballX, ballY] = ballWindow.getPosition();
  const bCenterX = ballX + BALL_SIZE / 2;
  const bCenterY = ballY + BALL_SIZE / 2;
  let display = findDisplayContainingPoint(bCenterX, bCenterY);
  if (!display) display = findNearestDisplay(bCenterX, bCenterY);
  const wa = display.workArea;
  const gap = 8;

  let panelY = ballY;
  panelY = Math.max(wa.y, Math.min(panelY, wa.y + wa.height - panelHeight));

  let panelX;
  if (ballX + BALL_SIZE + gap + panelWidth <= wa.x + wa.width) {
    panelX = ballX + BALL_SIZE + gap;
  } else if (ballX - gap - panelWidth >= wa.x) {
    panelX = ballX - gap - panelWidth;
  } else {
    const rightSpace = wa.x + wa.width - (ballX + BALL_SIZE);
    const leftSpace = ballX - wa.x;
    panelX = rightSpace > leftSpace ? wa.x + wa.width - panelWidth : wa.x;
  }

  return { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
}

function createPanelWindow() {
  const pos = getPanelPosition();
  const basePath = getBasePath();

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
      preload: path.join(basePath, 'preload.min.js')
    }
  });

  panelWindow.loadFile(path.join(basePath, 'panel.html'));
  if (!app.isPackaged) panelWindow.webContents.openDevTools({ mode: 'detach' });

  panelWindow.on('closed', () => {
    panelWindow = null;
  });
}

// Windows 高 DPI 启动修复：锁定缩放因子，避免 display-metrics-changed 反复触发导致窗口闪烁
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
}

// 禁用 GPU 加速：避免打包后 DPI 初始化期间的渲染异常
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  createTray();
  createBallWindow();

  screen.on('display-added', () => repositionAll());
  screen.on('display-removed', () => repositionAll());
  screen.on('display-metrics-changed', () => repositionAll());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createBallWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 托盘常驻，不退出
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

// ✅ 新增：获取窗口位置
ipcMain.handle('get-window-position', () => {
  if (ballWindow) {
    const [x, y] = ballWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

// 拖拽开始：返回窗口位置供渲染进程计算偏移量
ipcMain.handle('drag-start', () => {
  if (ballWindow) {
    const [x, y] = ballWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

// 拖拽中：setBounds 锁定 BALL_SIZE，防止高 DPI 下 setPosition 导致窗口尺寸变化
ipcMain.on('drag-ball', (event, { x, y }) => {
  if (!ballWindow) return;
  const rx = Math.round(x) || 0;
  const ry = Math.round(y) || 0;
  ballWindow.setBounds({ x: rx, y: ry, width: BALL_SIZE, height: BALL_SIZE });
});

// 松手：边界限位 + 边缘吸附 + 溢出回弹，保证悬浮球完整可见
ipcMain.on('save-ball-position', () => {
  if (!ballWindow || ballWindow.isDestroyed()) return;

  const [realX, realY] = ballWindow.getPosition();
  if (!Number.isFinite(realX) || !Number.isFinite(realY)) return;

  const ballCenterX = realX + BALL_SIZE / 2;
  const ballCenterY = realY + BALL_SIZE / 2;

  let display = findDisplayContainingPoint(ballCenterX, ballCenterY);
  if (!display) display = findNearestDisplay(ballCenterX, ballCenterY);
  if (!display) return;
  const wa = display.workArea;
  const snapDist = BALL_SIZE / 2 + 5;  // 27px

  // 四边限位：保证球体完整显示在 workArea 内
  let targetX = Math.max(wa.x, Math.min(realX, wa.x + wa.width - BALL_SIZE));
  let targetY = Math.max(wa.y, Math.min(realY, wa.y + wa.height - BALL_SIZE));

  // 四边吸附
  if (targetX - wa.x <= snapDist) targetX = wa.x;
  else if (wa.x + wa.width - (targetX + BALL_SIZE) <= snapDist) targetX = wa.x + wa.width - BALL_SIZE;
  if (targetY - wa.y <= snapDist) targetY = wa.y;
  else if (wa.y + wa.height - (targetY + BALL_SIZE) <= snapDist) targetY = wa.y + wa.height - BALL_SIZE;

  // 溢出回弹动画（250ms ease-out cubic，10 帧）
  if (targetX !== realX || targetY !== realY) {
    animateBallRebound(realX, realY, targetX, targetY);
  }

  store.set('ballPosition', { x: targetX, y: targetY });
});

function animateBallRebound(fromX, fromY, toX, toY) {
  if (!Number.isFinite(fromX) || !Number.isFinite(fromY) ||
      !Number.isFinite(toX) || !Number.isFinite(toY)) return;

  if (ballReboundAnimId) {
    clearTimeout(ballReboundAnimId);
    ballReboundAnimId = null;
  }

  const duration = 250;
  const totalFrames = 10;
  let frame = 0;

  function step() {
    if (!ballWindow || ballWindow.isDestroyed()) {
      ballReboundAnimId = null;
      return;
    }
    frame++;
    const t = frame / totalFrames;
    const ease = 1 - Math.pow(1 - t, 3);
    const curX = Math.round(fromX + (toX - fromX) * ease) || 0;
    const curY = Math.round(fromY + (toY - fromY) * ease) || 0;

    if (!Number.isFinite(curX) || !Number.isFinite(curY)) {
      ballReboundAnimId = null;
      return;
    }

    ballWindow.setBounds({ x: curX, y: curY, width: BALL_SIZE, height: BALL_SIZE });

    if (frame < totalFrames) {
      ballReboundAnimId = setTimeout(step, duration / totalFrames);
    } else {
      ballReboundAnimId = null;
    }
  }
  step();
}

// 面板拖拽开始时记录位置和尺寸，取消旧回弹动画
ipcMain.on('drag-panel-start', () => {
  if (panelWindow) {
    if (springAnimId) {
      clearTimeout(springAnimId);
      springAnimId = null;
    }
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
    dragPanelX += deltaX;
    dragPanelY += deltaY;

    // 计算所有显示器的虚拟桌面边界，作为绝对限位
    const displays = screen.getAllDisplays();
    let vsLeft = Infinity, vsTop = Infinity, vsRight = -Infinity, vsBottom = -Infinity;
    for (const d of displays) {
      if (d.bounds.x < vsLeft) vsLeft = d.bounds.x;
      if (d.bounds.y < vsTop) vsTop = d.bounds.y;
      if (d.bounds.x + d.bounds.width > vsRight) vsRight = d.bounds.x + d.bounds.width;
      if (d.bounds.y + d.bounds.height > vsBottom) vsBottom = d.bounds.y + d.bounds.height;
    }

    const centerX = dragPanelX + dragPanelW / 2;
    const centerY = dragPanelY + dragPanelH / 2;
    let display = findDisplayContainingPoint(centerX, centerY);
    if (!display) display = findNearestDisplay(centerX, centerY);
    const wa = display.workArea;

    // 限位：当前显示器 workArea ±50px 越界空间，但不可超出虚拟桌面
    const clampX = Math.max(vsLeft, Math.max(wa.x - 50, Math.min(Math.round(dragPanelX), wa.x + wa.width - dragPanelW + 50)));
    const clampY = Math.max(vsTop, Math.max(wa.y - 50, Math.min(Math.round(dragPanelY), wa.y + wa.height - dragPanelH + 50)));

    panelWindow.setBounds({
      x: Math.min(clampX, vsRight - dragPanelW),
      y: Math.min(clampY, vsBottom - dragPanelH),
      width: dragPanelW,
      height: dragPanelH
    });
  }
});

ipcMain.on('save-panel-position', () => {
  if (!panelWindow) return;

  const [realX, realY] = panelWindow.getPosition();
  const [w, h] = panelWindow.getSize();
  const centerX = realX + w / 2;
  const centerY = realY + h / 2;
  let display = findDisplayContainingPoint(centerX, centerY);
  if (!display) display = findNearestDisplay(centerX, centerY);
  const wa = display.workArea;
  const snapDist = 10;

  // 四边限位
  let targetX = Math.max(wa.x, Math.min(realX, wa.x + wa.width - w));
  let targetY = Math.max(wa.y, Math.min(realY, wa.y + wa.height - h));

  // 四边吸附（≤10px）
  if (targetX - wa.x <= snapDist) targetX = wa.x;
  else if (wa.x + wa.width - (targetX + w) <= snapDist) targetX = wa.x + wa.width - w;
  if (targetY - wa.y <= snapDist) targetY = wa.y;
  else if (wa.y + wa.height - (targetY + h) <= snapDist) targetY = wa.y + wa.height - h;

  // 溢出回弹动画（250ms ease-out，10 帧）
  const startX = realX, startY = realY;
  const endX = targetX, endY = targetY;
  if (startX === endX && startY === endY) {
    dragPanelX = endX;
    dragPanelY = endY;
    store.set('panelPosition', { x: endX, y: endY });
    return;
  }

  const duration = 250;
  const totalFrames = 10;
  let frame = 0;
  function springStep() {
    if (!panelWindow || panelWindow.isDestroyed()) return;
    frame++;
    const t = frame / totalFrames;
    const ease = 1 - Math.pow(1 - t, 3);
    const curX = Math.round(startX + (endX - startX) * ease);
    const curY = Math.round(startY + (endY - startY) * ease);
    panelWindow.setBounds({ x: curX, y: curY, width: w, height: h });
    if (frame < totalFrames) {
      springAnimId = setTimeout(springStep, duration / totalFrames);
    } else {
      springAnimId = null;
      dragPanelX = endX;
      dragPanelY = endY;
      store.set('panelPosition', { x: endX, y: endY });
    }
  }
  springStep();
});

ipcMain.on('toggle-panel', () => {
  if (panelWindow && !panelWindow.isDestroyed()) {
    if (panelWindow.isVisible()) {
      panelWindow.hide();
    } else {
      const savedPos = store.get('panelPosition');
      if (savedPos.x !== null && savedPos.y !== null) {
        panelWindow.setPosition(savedPos.x, savedPos.y);
      } else {
        const pos = getPanelPosition();
        panelWindow.setPosition(pos.x, pos.y);
      }
      panelWindow.show();
      panelWindow.webContents.send('refresh-snippets');
    }
  } else {
    createPanelWindow();
  }
});

ipcMain.on('close-panel', () => {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.hide();
  }
});

ipcMain.on('pause-jump', () => stopJumpInterval());
ipcMain.on('resume-jump', () => startJumpInterval());

ipcMain.on('tray-quit', () => {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) {
    trayMenuWin.close();
    trayMenuWin = null;
  }
  stopJumpInterval();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.destroy();
  if (ballWindow && !ballWindow.isDestroyed()) ballWindow.destroy();
  app.quit();
});

ipcMain.on('quit-app', () => {
  stopJumpInterval();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.destroy();
  }
  if (ballWindow && !ballWindow.isDestroyed()) {
    ballWindow.destroy();
  }
  app.quit();
});
