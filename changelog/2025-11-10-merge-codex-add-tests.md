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
