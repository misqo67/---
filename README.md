# 王牌菜榜承接方案（方案二）— 交互原型

首页「点评榜单」→ 榜单中心页 → 王牌菜榜 的完整承接链路交互演示，包含三种承接方案：

- **方案 A**：王牌菜榜以半浮层（bottom sheet）形式自动出现；从首页金刚区「王牌菜榜」入口手动进入时，整体页面上滑全屏展开。
- **方案 B**：上滑整页（slide-up full page）承接，进入动效带缓收（0.38s cubic-bezier(0.22, 1, 0.36, 1)）。
- **方案 C**：左滑整页（slide-left full page）承接。

功能要点：

- 全屏展开后保留白色状态栏（时间/信号/WiFi/电量），不被页面覆盖。
- 进入王牌菜榜后，榜首「苏小柳点心」商卡播放橙色描边高亮切图动效（500ms 淡入 → 保持 1.5s → 淡出）。
- 王牌菜榜页面为自包含单文件（`src/ace-standalone.html`，素材已内联为 data URI），通过 iframe 内嵌并经 postMessage 联动（tab 重置 / 导航模式切换 / 高亮重播）。

## 技术栈

Vite + React 18 + Tailwind CSS + shadcn/ui（脚手架来自 NoCode 平台标准模板）。

## 本地开发

```bash
npm install   # 或 yarn
npm run dev
```

## 目录结构

- `src/pages/Index.jsx` — 演示主容器（三方案切换、iframe 承载、状态栏覆盖层）
- `src/ace-standalone.html` — 王牌菜榜自包含页面（构建产物，素材内联）
- `public/ace.html` + `public/assets/` — 王牌菜榜页面源文件与素材（本地预览可用）
- `src/assets/` — 首页图 / 榜单中心图 / 金刚区图标
