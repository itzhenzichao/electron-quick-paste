# 面板窗口隐藏/显示替代销毁/创建 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 面板窗口首次创建后保持存活，hide/show 替代 close/create，消除 0.5~1 秒白屏。

**Architecture:** 提取面板定位逻辑为独立函数；toggle-panel 改为判断可见性做 hide/show/reposition；close-panel 改为 hide；quit-app 增加面板 destroy；渲染进程监听 refresh-snippets 事件刷新数据。

**Tech Stack:** Electron, electron-store

---

### Task 1: 提取面板定位函数 + 改造 toggle-panel / close-panel / quit-app

**Files:**
- Modify: `main.js`

- [ ] **Step 1: 提取面板定位函数，修改 createPanelWindow、toggle-panel、close-panel、quit-app 处理逻辑，移除 is-panel-visible handler**

将 `main.js` 第 167~381 行（从 `createPanelWindow` 到 `quit-app`）替换为以下代码：

```javascript
function getPanelPosition() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const [ballX, ballY] = ballWindow.getPosition();

  const panelWidth = 340;
  const panelHeight = 480;
  const gap = 8;

  let panelY = ballY;
  panelY = Math.max(0, Math.min(panelY, height - panelHeight));

  let panelX;
  if (ballX + BALL_SIZE + gap + panelWidth <= width) {
    panelX = ballX + BALL_SIZE + gap;
  } else if (ballX - gap - panelWidth >= 0) {
    panelX = ballX - gap - panelWidth;
  } else {
    const rightSpace = width - (ballX + BALL_SIZE);
    const leftSpace = ballX;
    panelX = rightSpace > leftSpace ? width - panelWidth : 0;
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

  panelWindow.on('closed', () => {
    panelWindow = null;
  });
}
```

`toggle-panel` 处理器替换为：

```javascript
ipcMain.on('toggle-panel', () => {
  if (panelWindow && !panelWindow.isDestroyed()) {
    if (panelWindow.isVisible()) {
      panelWindow.hide();
    } else {
      const pos = getPanelPosition();
      panelWindow.setPosition(pos.x, pos.y);
      panelWindow.show();
      panelWindow.webContents.send('refresh-snippets');
    }
  } else {
    createPanelWindow();
  }
});
```

`close-panel` 处理器替换为：

```javascript
ipcMain.on('close-panel', () => {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.hide();
  }
});
```

`quit-app` 处理器替换为：

```javascript
ipcMain.on('quit-app', () => {
  stopJumpInterval();
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.destroy();
  }
  app.quit();
});
```

删除 `is-panel-visible` IPC handler（第 278~280 行）：

```javascript
// 删除以下三行：
ipcMain.handle('is-panel-visible', () => {
  return panelWindow !== null && !panelWindow.isDestroyed();
});
```

- [ ] **Step 2: 构建并验证**

```bash
cd D:/lianxi/electron-quick-paste && node build.js
```

预期：构建成功，无报错。

- [ ] **Step 3: 提交**

```bash
git add main.js
git commit -m "feat: 面板 hide/show 替代 close/create，消除白屏

- 提取 getPanelPosition() 复用定位逻辑
- toggle-panel: 可见→hide, 隐藏→reposition+show+refresh
- close-panel: hide() 替代 close()
- quit-app: 增加面板 destroy()
- 移除未使用的 is-panel-visible handler

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: 更新 preload.js 暴露 refresh-snippets 事件

**Files:**
- Modify: `preload.js`

- [ ] **Step 1: 添加 onRefreshSnippets，移除 isPanelVisible**

将 `preload.js` 中的 `contextBridge.exposeInMainWorld` 调用替换为：

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSnippets: () => ipcRenderer.invoke('get-snippets'),
  addSnippet: (snippet) => ipcRenderer.invoke('add-snippet', snippet),
  updateSnippet: (snippet) => ipcRenderer.invoke('update-snippet', snippet),
  deleteSnippet: (id) => ipcRenderer.invoke('delete-snippet', id),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  getPlatform: () => process.platform,
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragBall: (pos) => ipcRenderer.send('drag-ball', pos),
  saveBallPosition: () => ipcRenderer.send('save-ball-position'),
  dragPanelStart: () => ipcRenderer.send('drag-panel-start'),
  dragPanel: (delta) => ipcRenderer.send('drag-panel', delta),
  togglePanel: () => ipcRenderer.send('toggle-panel'),
  closePanel: () => ipcRenderer.send('close-panel'),
  pauseJump: () => ipcRenderer.send('pause-jump'),
  resumeJump: () => ipcRenderer.send('resume-jump'),
  onJumpScale: (callback) => ipcRenderer.on('jump-scale', (event, data) => callback(data)),
  onRefreshSnippets: (callback) => ipcRenderer.on('refresh-snippets', () => callback()),
  quitApp: () => ipcRenderer.send('quit-app')
});
```

- [ ] **Step 2: 提交**

```bash
git add preload.js
git commit -m "feat(preload): 添加 onRefreshSnippets 事件，移除未使用的 isPanelVisible

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 更新 panel.html 监听刷新事件

**Files:**
- Modify: `panel.html`

- [ ] **Step 1: 在 init 函数中添加 refresh-snippets 监听**

在 `panel.html` 的 `init()` 函数末尾（第 308 行 `setupEvents();` 之后，第 309 行 `}` 之前）插入：

```javascript
      window.electronAPI.onRefreshSnippets(async () => {
        snippets = await window.electronAPI.getSnippets();
        filterSnippets(searchInput.value);
      });
```

即 `init` 函数变为：

```javascript
    async function init() {
      const isMac = window.electronAPI.getPlatform() === 'darwin';
      btnQuit.textContent = isMac ? '⏻' : '🔌';
      
      snippets = await window.electronAPI.getSnippets();
      filteredSnippets = [...snippets];
      renderSnippets();
      setupEvents();
      window.electronAPI.onRefreshSnippets(async () => {
        snippets = await window.electronAPI.getSnippets();
        filterSnippets(searchInput.value);
      });
    }
```

- [ ] **Step 2: 构建并验证**

```bash
cd D:/lianxi/electron-quick-paste && node build.js
```

预期：构建成功，`dist/` 中 `panel.html`、`preload.min.js`、`main.min.js` 均已更新。

- [ ] **Step 3: 提交**

```bash
git add panel.html
git commit -m "feat(panel): 监听 refresh-snippets 事件，show 时自动刷新列表

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
