# CLAUDE.md

## 项目概述

物理模型演示网站 — Vue 3.5 驱动的 MPA（基于 Vue Router hash history），包含 5 个交互式物理模拟。

## 技术栈

- **Vue 3.5.35** + **Vue Router 5.1.0** (hash mode)
- **Vite 8** (构建工具)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **MathJax 4** (LaTeX 公式渲染，通过 `vite-plugin-static-copy` 复制到 `lib/mathjax/`)
- **TypeScript 6**
- 包管理器: **pnpm**

## 目录结构

```
src/
├── main.ts                  # 入口：createApp → use(router) → mount
├── App.vue                  # 根组件，仅含 <RouterView />
├── router/index.ts          # 路由：/, /pendulum, /conical-pendulum, /train-turn, /oscilloscope, /electric-field
├── components/              # 全局共享 UI 组件
│   ├── NavBar.vue           # 统一顶部导航栏（左边返回按钮 + 居中标题）
│   ├── Copyright.vue        # 右下角版权（"版权所有 东北育才 张伯望"）
│   ├── Latex.vue            # MathJax LaTeX 渲染（支持 inline/block + color）
│   ├── AppButton.vue        # 统一按钮（variant: primary/secondary/success/warning/danger/ghost）
│   ├── AppSlider.vue        # 统一滑块（带 label、数值显示）
│   ├── AppToggle.vue        # 统一开关
│   ├── AppSegmentedControl.vue  # 统一分段控制器
│   └── DataRow.vue          # 数据行（label + symbol + value + unit）
└── views/
    ├── Home.vue             # 首页：3 个 demo 卡片入口
    ├── pendulum/            # 单摆（异步路由，SVG 渲染，RK4 积分）
    ├── conical-pendulum/    # 圆锥摆（异步路由，3D Canvas 渲染）
    ├── train-turn/          # 火车转弯（异步路由，2D Canvas 渲染）
    ├── oscilloscope/        # 示波管（异步路由，2D Canvas 伪3D投影）
    └── electric-field/      # 异号电荷电场与等势面（异步路由，Three.js 3D渲染）
```

## 核心架构约定

- **所有 demo 都是异步路由**：`component: () => import(...)`，实现代码分割
- **共享 UI 组件优先**：NavBar、Copyright、AppButton 等必须在所有 demo 页面中复用，不得在 demo 内联重写
- **每个 demo 页面使用 `<NavBar>` + `<Copyright>`**：NavBar 接受 `title`（标题）、`gradient`（深色主题用渐变色标题）、`light`（浅色主题用白底）props
- **物理计算逻辑与渲染分离**：`utils/physics.ts` 负责计算，组件负责 Canvas/SVG 渲染
- **LaTeX 字符串直接使用单反斜杠**：Vue 模板静态属性中 `latex="\theta"` 会正确传递给组件（Vue 模板编译器不处理 HTML 属性值中的反斜杠转义），无需 `\\` 或 `String.raw`
- **所有 demo 独立目录**：含 `types.ts`、`constants.ts`、`components/`
- **Three.js 懒加载**：`electric-field` 组件使用动态 `import('three')` 按需加载，避免增大主包
- 生产构建输出到 `dist/`

## 命令

```bash
pnpm dev      # 开发服务器
pnpm build    # 生产构建
pnpm preview  # 预览构建产物
pnpm lint     # oxlint + oxfmt
```

## 新增 Demo 流程

1. 在 `src/views/<name>/` 下创建目录，含 `types.ts`、视图组件、子组件
2. 在 `src/router/index.ts` 添加异步路由
3. 在 `src/views/Home.vue` 的 `demos` 数组中添加卡片
4. 视图使用 `<NavBar>` + `<Copyright>` 保持导航栏和版权统一
