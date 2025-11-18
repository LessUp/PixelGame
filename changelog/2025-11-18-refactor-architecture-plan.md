# 2025-11-18 架构重构方案文档

## 变更
- 新增 `docs/refactor-architecture-plan.md`，给出像素大战前端项目的整体架构重构方案：
  - 明确 UI / 应用层 / Store slices / 基础设施四层结构。
  - 规划 `usePixelStore` 拆分为多个 slice（core/history/viewport/tools/uiPrefs/sharing/network）。
  - 设计 `utils` 工具模块与渐进式迁移步骤（阶段 A/B/C）。
- 不涉及运行时代码行为变更，仅新增文档与规划。

## 测试
- 未执行（仅文档变更）。
