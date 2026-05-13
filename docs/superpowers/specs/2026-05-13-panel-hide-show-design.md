# 面板窗口隐藏/显示替代销毁/创建

## 问题

每次点击悬浮球，`createPanelWindow()` 新建 BrowserWindow，渲染进程初始化导致 0.5~1 秒白屏。

## 设计

面板窗口首次创建后保持存活，后续"关闭"改为 `hide()`，"打开"改为重新定位 + `show()` + 刷新数据。

### 改动点

**main.js:**

- `toggle-panel`：
  - 面板存在且可见 → `hide()`
  - 面板存在且不可见 → 基于球的当前位置重新定位（`setPosition`） → `show()` → `webContents.send('refresh-snippets')`
  - 面板不存在 → `createPanelWindow()`（仅首次）
- `close-panel`：`hide()` 替代 `close()`，不设 `null`
- `quit-app`：销毁面板窗口（`if (panelWindow) panelWindow.destroy()`）
- 移除 `is-panel-visible` IPC handler（不再需要，可见性由主进程自行判断）

**panel.html:**

- 新增监听 `refresh-snippets` 事件，触发后重新 `getSnippets()` 并渲染列表
- 隐藏时保留搜索框内容、弹窗状态、滚动位置

**preload.js:**

- 新增 `onRefreshSnippets` 方法暴露给渲染进程

### 行为

```
首次点击球 → 创建窗口 → 加载 HTML → 显示
再次点击球 → hide()（渲染进程保持运行，状态保留）
第三次点击 → 重新定位 + show() + 发刷新信号 → 瞬间显示
退出应用   → destroy() 面板 + quit
```

### 边界情况

- 隐藏时保留所有 UI 状态（搜索框文本、弹窗开关、滚动位置）
- 悬浮球位置变化后再次打开，面板基于球的新位置重新定位
- 面板数据刷新：show 时触发，确保与 store 同步
- 应用退出时正确销毁面板，避免进程残留
