# 拖拽优化设计文档

## 概述

优化悬浮球和面板的拖拽体验：增加边界限位、边缘吸附、溢出回弹、多屏适配、位置持久化、display 变更自动校正。

## 架构决策

主进程集中化方案：拖拽逻辑、边界计算、持久化全部在主进程，渲染进程仅负责监听鼠标事件和发送 IPC 增量。

## 详细设计

### 1. 渲染进程

**ball.html — 悬浮球**
- 拖拽阈值从 1px 改为 5px（`hasMoved` 判定用 5px 而非 1px）
- ≤5px 视为单击，触发 togglePanel

**panel.html — 面板**
- 拖拽开始时 body 加 `pointer-events: none`，松手恢复，防止拖拽过程中误触发内容区点击/输入框聚焦

### 2. 主进程 — 悬浮球拖拽

**drag-ball（mousemove 中）：**
- 累加 delta 到 dragPosX/dragPosY
- 找到球中心点所在显示器（用 bounds 判断包含关系，找不到用最近显示器）
- Y 轴：clamp 到该显示器 workArea 范围内（顶部顶边、底部避开任务栏）
- X 轴：不限，允许跨屏拖拽
- setPosition 到 clamp 后的位置

**save-ball-position（mouseup 中）：**
- 找到球中心最近的显示器（欧几里得距离到各显示器中心）
- 左右吸附判断：球中心距左边缘 ≤ 27px (BALL_SIZE/2) → x = bounds.x；距右边缘 ≤ 27px → x = bounds.x + bounds.width - BALL_SIZE
- Y 轴 clamp 到 workArea
- 保存到 store

### 3. 主进程 — 面板拖拽

**drag-panel（mousemove 中）：**
- 累加 delta，setBounds 时允许短暂越界 ±50px（给跨屏过渡空间）
- 不做硬限位

**save-panel-position（mouseup 中，新增 IPC）：**
1. 找到窗口中心所在显示器
2. 四边 clamp 到 workArea
3. 吸附：任一边缘到屏幕边界 ≤ 10px → 贴紧
4. 回弹动画：若窗口仍越界，250ms ease-out 分帧 setBounds 弹回合法位置
5. 保存到 store（x, y）

### 4. 多屏适配

- 不再仅依赖 screen.getPrimaryDisplay()
- 用 screen.getAllDisplays() + 窗口中心点判断所属显示器
- getPanelPosition() 也改用 ballWindow 所在显示器计算

### 5. 持久化

store schema 扩展 panelPosition：
```js
defaults: {
  snippets: [...],
  ballPosition: { x: null, y: null },
  panelPosition: { x: null, y: null }
}
```
启动时 ballWindow 和 panelWindow（show 时）读取存储位置。

### 6. Display 变更监听

```js
screen.on('display-added', repositionAll)
screen.on('display-removed', repositionAll)
screen.on('display-metrics-changed', repositionAll)
```
repositionAll：检查球中心、面板中心是否在任一显示器 bounds 内，不在则重置到主屏安全区域。

### 7. preload.js

新增：`savePanelPosition: () => ipcRenderer.send('save-panel-position')`

### 8. 面板恢复弹出位置

toggle-panel show 时，若 store 有保存的面板位置则使用保存位置，否则用 getPanelPosition() 计算。
