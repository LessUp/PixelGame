# 合并记录：codex/add-tests-for-usepixelstore-functions 到 master

日期：2025-11-10
分支：origin/codex/add-tests-for-usepixelstore-functions → master

## 冲突解决概览
- README.md：统一“常用脚本”为 vitest-shim 方案；移除冲突标记。
- package.json：
  - scripts：采用 `scripts/vitest-shim` 运行器（`test`、`test:bench`）。
  - devDependencies：`vitest` 指向 `file:scripts/vitest-shim`。
- src/index.css：采用 Tailwind v4 推荐导入 `@import "tailwindcss";`；移除冲突标记。
- src/components/MiniMap.tsx：`useEffect(() => { draw() }, [draw, version, palette])`，包含 `palette` 以确保调色板变更时重绘；移除冲突标记。
- src/components/PixelCanvas.tsx、src/store/usePixelStore.ts：保留 ours（上一合并已定版）。
- vitest.setup.ts、src/store/usePixelStore.test.ts、package-lock.json：采用 theirs（来自测试分支）。

## 其他变更（来自分支）
- 新增/修改：`.github/workflows/ci.yml`、`scripts/vitest-shim/*`、`scripts/test-runner.mjs`、`src/store/usePixelStore.performance.test.ts`、`eslint.config.js`、`tsconfig.app.json` 等。

## 说明
- 选择 vitest-shim 原因：仓库同时存在 `tools/mini-vitest` 与 `scripts/vitest-shim` 两套实现；为兼容新增测试与 CI，统一使用 `scripts/vitest-shim`。
- Tailwind：项目使用 Tailwind v4，故采用 `@import "tailwindcss";`。

## 后续动作
- 推送 master 到远端。
- 如需，删除已合并的远端分支。

## RoadMap
 愿景

  - 以 README 中 1024×1024、32 色离线玩法为黄金样板，保持交互到渲染全链路时延 <100 ms、帧率 ≥60 fps (README.md:33).
  - 逐步把 WebSocket 客户端的心跳与重连机制演进为跨区域实时协作，目标连接成功率 ≥99% (src/services/wsClient.ts:1).
  - 让 PNG/JSON/Hash 导出成为内容循环，支持跨端分享与版本追踪，沉淀创作资产 (src/store/usePixelStore.ts:420).
  - 依托现有 lint/test/bench 脚本建立质量红线，每次合并前默认跑完 npm run lint && npm run test && npm run test:bench
    (package.json:6).

  阶段0 基础（第0‑1周）

  - 产出性能与交互基线文档（冷却、撤销、导入导出、移动端手势），记录 FPS、交互延迟、导出耗时，为后续优化提供对照标准。
  - 拆解 usePixelStore 中 Pixel/Viewport/Session 子状态，明确持久化、历史、工具、WS 之间的依赖边界，为可变画布与多实例预留空间
    (src/store/usePixelStore.ts:127).
  - 用流程图覆盖 README 的所有操作说明，统一桌面/移动端手势与快捷键用语，减少设计与开发沟通成本 (README.md:44).
  - 在 CI 或临时 Git Hook 中接入 npm run lint/test/test:bench，输出首批基准数据并定义通过阈值 (package.json:6).

  阶段1 体验&性能（第2‑4周）

  - 落实 README 性能路线：调色板切换、全量导入等场景改用 ImageData/OffscreenCanvas 批量写入，目标 1M 像素刷新 <40 ms
    (README.md:73).
  - 深化移动端交互（双击缩放、长按吸管、拖拽阻尼、触觉反馈），确保首屏可互动时间 <2.5 s、触控成功率 >95% (README.md:74).
  - 扩展 usePixelStore 的网格/光标配置，把 gridColor/gridAlpha/gridMinScale 变成 UI 可调，并在冷却/吸管状态给出视觉提示 (src/
    store/usePixelStore.ts:345).
  - 增强 npm run test:bench：加入批量填充、拖拽缩放、导出基准，用 Vitest 自定义阈值守住帧耗与内存水位 (package.json:12).

  阶段2 联机协作（第5‑8周）

  - 在 UI 中暴露「联机」入口，串联 connectWS/disconnectWS/wsStatus 的状态流，支持用户输入服务器地址与错误提示 (src/store/
    usePixelStore.ts:218).
  - 利用 wsClient 的心跳、重连与批量消息能力，补完日志可观测性与退避策略，确保前端自动恢复 (src/services/wsClient.ts:38).
  - 设计服务端权威的冷却/冲突校验，把 placePixel 流程拆分为本地预测 + 服务端确认，并根据返回结果回滚/重绘 (src/store/
    usePixelStore.ts:372).
  - 构建观战/回放模式：复用 applyRemotePixels 的批量写入能力，为只读用户提供低频刷新与最小化网络占用 (src/store/
    usePixelStore.ts:258).

  阶段3 平台化（第9周+）

  - 在现有 PNG/JSON/Hash 导出之上加入房间代码、快照时间线与协作链接，支撑赛事/活动运营 (src/store/usePixelStore.ts:420).
  - 推进 README 中的可变画布与多语言需求，允许 2048² 网格、按房间加载调色板，并抽离文案资源以支持 i18n (README.md:79,
    README.md:97).
  - 构建社区/治理工具：房间权限、踢人、举报、慢速模式，与未来后端的权限模型打通。
  - 建立运营监控（活跃用户、冷却违规、服务器延迟），联合弹性扩容与 A/B 测试，形成数据驱动迭代闭环.

  后续建议

  1. 先同步阶段0交付物（基线文档、状态图、CI配置）的负责人与截止时间，确保后续讨论有统一背景。
  2. 召开一次路线评审会，按阶段优先级拆解任务卡并放入迭代排期，锁定指标与验收方式。
