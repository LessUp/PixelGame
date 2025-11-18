# 2025-11-18 阶段B-1：拆分 UI 偏好 slice

## 变更
- 新增 `src/store/pixel-ui-prefs.slice.ts`：
  - 使用 `createPixelUiPrefsSlice` 管理 `showGrid`/`gridColor`/`gridAlpha`/`gridMinScale` 以及光标样式与提示相关状态。
- 调整 `src/store/usePixelStore.ts`：
  - 从内联状态中移除上述 UI 偏好字段与 setter。
  - 在 `createPixelStoreState` 返回对象中展开 `createPixelUiPrefsSlice(set, get)`，保持对外 API 不变。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
