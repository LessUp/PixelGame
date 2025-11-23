# 2025-11-23 修复 Controls 组件 cn 导入缺失

- **变更内容**：在 `src/components/Controls.tsx` 中补充 `cn` 工具函数的导入。
- **原因**：运行时报错 `ReferenceError: cn is not defined`，导致 `<Controls>` 组件渲染失败，整个页面黑屏。
- **影响**：前端页面无法正常渲染 UI，只显示背景。
- **结果**：修复后页面可正常加载 Controls 区域，不再出现上述报错。
