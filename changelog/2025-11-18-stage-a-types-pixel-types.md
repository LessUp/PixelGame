# 2025-11-18 阶段A-2：抽取 pixel-types 类型定义

## 变更
- 新增 `src/store/pixel-types.ts`：
  - 定义 `Viewport`/`Tool`/`CursorStyle`/`HistoryItem` 等基础类型。
  - 将 `PixelStore` 拆分为多个子接口（core/viewport/history/tools/uiPrefs/sharing/network）再组合导出。
- 调整 `src/store/usePixelStore.ts`：
  - 从 `pixel-types` 导入类型，移除文件内部的重复类型定义。
  - 保持对外导出的 `PixelStore` 类型别名不变（兼容现有引用）。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
