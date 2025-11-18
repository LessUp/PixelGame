# 2025-11-18 阶段B-4：拆分 history slice

## 变更
- 新增 `src/store/pixel-history.slice.ts`：
  - 管理 `history`/`historyLimit` 以及 `undo`/`setHistoryLimit` 实现。
- 调整 `src/store/usePixelStore.ts`：
  - 从内联状态中移除 `history`/`historyLimit`/`undo`/`setHistoryLimit`。
  - 在 `createPixelStoreState` 中展开 `createPixelHistorySlice(set, get)`，保持对外 API 不变。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
