# 2025-11-18 阶段A-1：抽取 utils/color 与 utils/math

## 变更
- 新增 `src/utils/color.ts` 与 `src/utils/math.ts`：
  - 统一 `hexToRgb`/`paletteToRGB` 和 `clamp` 的实现。
- 调整下列文件使用公共工具函数，移除重复实现：
  - `src/store/usePixelStore.ts`
  - `src/components/PixelCanvas.tsx`
  - `src/components/MiniMap.tsx`

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
