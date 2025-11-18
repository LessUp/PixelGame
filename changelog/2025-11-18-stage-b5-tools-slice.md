# 2025-11-18 阶段B-5：拆分 tools slice

## 变更
- 新增 `src/store/pixel-tools.slice.ts`：
  - 管理工具与冷却相关状态：`cooldownMs`/`lastPlacedAt`/`tool`/`selection`。
  - 提供工具行为：`setTool`/`startSelection`/`updateSelection`/`clearSelection`/`fillSelection`/`getPixel`/`canPlace`/`placePixel`/`pickColor`/`setSelected`。
  - 通过依赖注入的 `socket` 适配层调用 `sendPlacePixel`/`sendFillRect`。
- 调整 `src/store/usePixelStore.ts`：
  - 在 `createPixelStoreState` 中展开 `createPixelToolsSlice(socket)(set, get)`。
  - 移除内联的工具相关状态与方法定义，保持对外 API 不变。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
