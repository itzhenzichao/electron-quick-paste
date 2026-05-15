# 悬浮球拖拽重构设计文档

## 概述

使用 Pointer Events + setPointerCapture + rAF 节流方案替代 `-webkit-app-region: drag` 原生拖拽，解决点击无法触发面板的问题，同时消除拖拽漂移。

## 根因分析

1. **鼠标移出小窗口后 mousemove 事件链断裂**：44x44 悬浮球，鼠标稍快即离开窗口区域，`mousemove` 停止触发，拖拽中断
2. **高 DPI 下 `setPosition` 导致窗口尺寸变化**：Electron 已知 bug（#10862），应使用 `setBounds` 锁定宽高

## 架构

```
ball.html (渲染进程)                  main.js (主进程)
│                                     │
├─ pointerdown ──────────────────────►│ drag-start (invoke)
│  ball.setPointerCapture(id)         │   getPosition() 返回窗口位置
│  等待 dragStart invoke 返回          │
│  计算 offsetX/Y                      │
│                                     │
├─ pointermove (rAF 节流)             │
│  target = screenX - offset          │
│  send {x, y} via IPC ─────────────►│ drag-ball
│                                     │   setBounds({x, y,
│                                     │     w: BALL_SIZE, h: BALL_SIZE})
│                                     │
├─ pointerup ────────────────────────►│ save-ball-position
│  ≤3px → togglePanel                 │   边界限位 + 吸附 + 回弹
│  >3px → saveBallPosition            │   store.set(ballPosition)
└─ lostpointercapture (安全网)         │
```

## 关键决策

### 1. Pointer Events + setPointerCapture
- `pointerdown` 时调用 `ball.setPointerCapture(e.pointerId)` 捕获指针
- 捕获后所有 `pointermove` / `pointerup` 事件发到 ball 元素，即使鼠标移出窗口
- `touch-action: none` 阻止浏览器默认手势
- `lostpointercapture` 安全网防止状态泄漏

### 2. rAF 节流
- `pointermove` 中存储 `pendingX/Y`，通过 `requestAnimationFrame` 每帧最多发一次 IPC
- 避免主进程消息堆积，与屏幕刷新率同步

### 3. 主进程 setBounds 锁定尺寸
- 所有 ballWindow 位置操作统一用 `setBounds({x, y, width: BALL_SIZE, height: BALL_SIZE})`
- 覆盖：拖拽中、回弹动画、跳跃动画、display 变更重定位

### 4. 边界检测与回弹（save-ball-position）
- 找到球体中心所在 display 的 workArea
- 四边限位：保证球体完整显示在工作区内
- 四边吸附：距边缘 ≤27px（BALL_SIZE/2 + 5）自动贴边
- 如有溢出，250ms cubic ease-out 动画弹回

### 5. 点击 vs 拖拽判断
- threshold: 3px
- 鼠标移动 ≤3px 视为点击，触发 togglePanel
- 鼠标移动 >3px 视为拖拽，保存位置

## 文件变更

| 文件 | 变更 |
|------|------|
| ball.html | Pointer Events 替代 mouse events；setPointerCapture；rAF 节流；移除 `-webkit-app-region: drag` |
| preload.js | 恢复 `dragStart` (invoke)、`dragBall` (send) |
| main.js | 新增 drag-start、drag-ball 处理器；save-ball-position 增加限位+吸附+回弹；animateBallRebound 函数；所有 ball 定位改用 setBounds |
