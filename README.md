# Electron 悬浮球快捷粘贴工具

一个轻量级的桌面快捷粘贴工具，通过悬浮球快速访问常用文本片段。

## 功能特性

- ✅ 桌面悬浮球，可自由拖动（无留白）
- ✅ 点击展开快捷文本列表面板
- ✅ 一键复制到剪贴板
- ✅ 添加、编辑、删除快捷文本（无需标题，直接保存内容）
- ✅ 模糊搜索过滤内容
- ✅ 面板可拖拽移动
- ✅ 本地持久化存储
- ✅ 深色主题，简洁现代的 UI 设计
- ✅ 支持 Windows 和 macOS

## 平台差异

| 功能 | macOS | Windows |
|------|-------|---------|
| 悬浮球跳跃动画 | ✅ 每 5 秒自动弹跳 | ❌ 不启用 |
| 退出按钮图标 | ⏻ | 🔌 |
| 应用图标格式 | .png | .ico |
| 打包格式 | DMG / ZIP | Portable（免安装） |
| 窗口关闭行为 | 不退出应用（保留在 Dock） | 直接退出应用 |

> 平台检测逻辑统一使用 `process.platform === 'darwin'` 判断 macOS，渲染进程通过 preload 暴露的 `getPlatform()` 获取，与主进程保持一致。

## 快速开始

### 1. 安装依赖

```bash
cd electron-quick-paste
npm install
```

### 2. 运行应用

```bash
npm start
```

> `npm start` 会先执行构建（压缩 JS、复制资源到 dist 目录），再启动 Electron。

### 3. 使用方法

1. **拖动悬浮球**：按住悬浮球拖动到屏幕任意位置，松手自动吸边（macOS）
2. **点击悬浮球**：展开/关闭快捷文本列表面板
3. **复制文本**：点击列表项自动复制到剪贴板
4. **添加文本**：点击面板右上角 "+" 按钮，在弹窗中输入内容，`Ctrl+Enter` 快捷保存
5. **编辑/删除**：悬停列表项显示编辑 ✎ 和删除 ✕ 按钮
6. **搜索内容**：在搜索框输入关键词模糊过滤
7. **移动面板**：拖拽面板标题栏移动面板位置
8. **退出应用**：点击退出按钮，确认后退出

## 项目结构

```
electron-quick-paste/
├── main.js            # 主进程（窗口管理、IPC 通信、拖拽逻辑）
├── preload.js         # 预加载脚本（暴露安全 API 给渲染进程）
├── ball.html          # 悬浮球渲染页面
├── panel.html         # 面板渲染页面（含模态弹窗）
├── build.js           # 构建脚本（esbuild 压缩 + 资源复制）
├── package.json       # 项目配置
├── electron-builder.json  # 打包配置
├── .npmrc             # npm 镜像配置
├── build/             # 应用图标资源
│   ├── icon.png       # 通用图标
│   ├── icon.ico       # Windows 图标
│   └── icon.icns      # macOS 图标
└── dist/              # 构建输出目录（gitignore）
    ├── main.min.js
    ├── preload.min.js
    ├── ball.html
    ├── panel.html
    └── build/
```

## 打包发布

### 打包优化说明

本项目已配置以下打包优化策略，以最小化应用体积：

- ✅ **代码压缩**：使用 esbuild 压缩 JS 代码
- ✅ **ASAR 打包**：将应用代码打包为单个 asar 文件
- ✅ **文件过滤**：只打包必要的 dist 目录文件
- ✅ **目标优化**：Windows 使用 Portable 格式（无需安装程序）
- ✅ **架构优化**：只打包 x64 架构（减少体积）
- ✅ **国内镜像**：使用 npmmirror 镜像加速下载

### 打包 Windows 版本

```bash
npm run pack:win
```

生成的 Portable 可执行文件位于 `dist/` 目录，无需安装即可运行。

### 打包 macOS 版本

```bash
npm run pack:mac
```

生成的 DMG 和 ZIP 文件位于 `dist/` 目录。

### 同时打包两个平台

```bash
npm run release
```

### 仅构建压缩资源（不打包）

```bash
npm run build
```

用于测试资源压缩效果，压缩后的文件位于 `dist/` 目录。

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **electron-store**: 本地数据持久化
- **esbuild**: 代码压缩构建
- **原生 CSS**: 无框架的简洁 UI

## 注意事项

1. **macOS 权限**：首次运行可能需要在"系统偏好设置 > 安全性与隐私"中允许应用
2. **Windows Defender**：可能会误报，选择"仍要运行"即可
3. **Windows DPI 缩放**：面板拖拽使用 `setBounds()` 而非 `setPosition()`，以防止 DPI 缩放导致窗口尺寸漂移
4. **数据存储位置**：
   - Windows: `%APPDATA%/electron-quick-paste/quick-paste-data.json`
   - macOS: `~/Library/Application Support/electron-quick-paste/quick-paste-data.json`

## 许可证

MIT License

## 作者

zzc
