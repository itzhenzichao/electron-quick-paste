# Electron 悬浮球快捷粘贴工具

一个轻量级的桌面快捷粘贴工具，通过悬浮球快速访问常用文本片段。

## 功能特性

- ✅ 桌面悬浮球，可自由拖动（无留白）
- ✅ 点击展开快捷文本列表
- ✅ 一键复制到剪贴板
- ✅ 添加、编辑、删除快捷文本（无需标题，直接保存内容）
- ✅ 模糊搜索过滤内容
- ✅ 本地持久化存储
- ✅ 深色主题，简洁现代的 UI 设计
- ✅ 支持 Windows 和 macOS

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

### 3. 使用方法

1. **拖动悬浮球**：按住悬浮球拖动到屏幕任意位置
2. **点击悬浮球**：展开快捷文本列表
3. **复制文本**：点击列表项自动复制到剪贴板
4. **添加文本**：点击面板右上角 "+" 按钮，直接输入内容
5. **编辑/删除**：悬停列表项显示编辑和删除按钮
6. **搜索内容**：在搜索框输入关键词模糊过滤
7. **快捷键**：`Ctrl+Shift+V` (Windows) 或 `Cmd+Shift+V` (macOS) 快速切换面板

## 项目结构

```
electron-quick-paste/
├── package.json      # 项目配置
├── main.js           # 主进程
├── preload.js        # 预加载脚本
├── index.html        # 渲染页面
├── renderer.js       # 渲染逻辑
└── README.md         # 说明文档
```

## 打包发布

### 打包优化说明

本项目已配置以下打包优化策略，以最小化应用体积：

- ✅ **代码压缩**：使用 esbuild 压缩 JS、CSS、HTML 代码
- ✅ **最大压缩**：使用 `compression: maximum` 配置
- ✅ **ASAR 打包**：将应用代码打包为单个 asar 文件
- ✅ **文件过滤**：只打包必要的 dist 目录文件
- ✅ **目标优化**：Windows 使用 Portable 格式（无需安装程序）
- ✅ **架构优化**：只打包 x64 架构（减少体积）
- ✅ **移除调试代码**：自动移除 console 和 debugger
- ✅ **国内镜像**：使用 npmmirror 镜像加速下载

### 打包 Windows 版本

```bash
npm run build:win
```

生成的可执行文件位于 `dist/` 目录（Portable 格式，无需安装）。

### 打包 macOS 版本

```bash
npm run build:mac
```

生成的 DMG 和 ZIP 文件位于 `dist/` 目录。

### 打包 macOS ZIP 版本（更小体积）

```bash
npm run build:mac:zip
```

只生成 ZIP 压缩包，体积更小。

### 同时打包两个平台

```bash
npm run build
```

### 仅构建压缩资源（不打包）

```bash
npm run build:assets
```

用于测试资源压缩效果，压缩后的文件位于 `dist/` 目录。

### 预期体积优化效果

经过优化后，应用体积预期为：
- macOS DMG: 约 70-80MB（未优化前约 700MB）
- macOS ZIP: 约 60-70MB
- Windows Portable: 约 65-75MB

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **electron-store**: 本地数据持久化
- **原生 CSS**: 无框架的简洁 UI

## 注意事项

1. **macOS 权限**：首次运行可能需要在"系统偏好设置 > 安全性与隐私"中允许应用
2. **Windows Defender**：可能会误报，选择"仍要运行"即可
3. **数据存储位置**：
   - Windows: `%APPDATA%/electron-quick-paste/quick-paste-data.json`
   - macOS: `~/Library/Application Support/electron-quick-paste/quick-paste-data.json`

## 自定义

### 修改悬浮球颜色

编辑 `index.html` 中的 `.floating-ball` 样式：

```css
.floating-ball {
  background: linear-gradient(135deg, #你的颜色1 0%, #你的颜色2 100%);
}
```

### 修改窗口大小

编辑 `main.js` 中的窗口尺寸：

```javascript
mainWindow = new BrowserWindow({
  width: 60,  // 悬浮球大小
  height: 60,
  // ...
});
```

### 修改快捷键

编辑 `main.js` 中的快捷键注册：

```javascript
globalShortcut.register('CommandOrControl+Shift+V', () => {
  // ...
});
```

## 许可证

MIT License

## 作者

Your Name
