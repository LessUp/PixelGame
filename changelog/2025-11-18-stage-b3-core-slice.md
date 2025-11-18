# 2025-11-18 阶段B-3：拆分核心像素 core slice

## 变更
- 新增 `src/store/pixel-core.slice.ts`：
  - 通过 `createPixelCoreSlice(width, height, pixels, defaultPalette)` 管理：
    - `width`/`height`/`pixels`
    - `palette`/`paletteRGB`
    - `selected`/`version`
    - `dirty`/`fullRedraw`/`consumeDirty`
- 调整 `src/store/usePixelStore.ts`：
  - 在 `createPixelStoreState` 中保留 width/height/pixels 的初始化和本地存档读取。
  - 使用 `createPixelCoreSlice(...)` 生成核心状态，并移除内联字段定义。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
