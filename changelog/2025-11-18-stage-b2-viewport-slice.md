# 2025-11-18 阶段B-2：拆分 viewport slice

## 变更
- 新增 `src/store/pixel-viewport.slice.ts`：
  - 管理 `viewport`/`canvasW`/`canvasH` 以及 `setCanvasSize`/`setViewport`/`panBy`/`setScale`/`centerOn`。
- 调整 `src/store/usePixelStore.ts`：
  - 从内联状态中移除上述 viewport 相关字段与方法。
  - 在 `createPixelStoreState` 返回对象中展开 `createPixelViewportSlice(set, get)`，保持对外 API 不变。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
