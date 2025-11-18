# 像素大战前端 · 架构重构方案（v1）

> 适用范围：本仓库当前 master 分支，项目尚未对外上线，可以接受「不兼容改动 + 目录调整」。
> 目标：在 **不牺牲 KISS 原则** 的前提下，系统性重构架构和状态管理，为后续「联机扩展 / 可变画布 / i18n」打基础。

---

## 0. 设计原则

- **功能等价优先**：
  - 重构过程中，保持现有用户能力（绘制、撤销、导入导出、迷你地图、联机适配层等）不回退。
- **KISS（Keep It Simple, Stupid）**：
  - 不引入额外框架（例如 Redux、React Query 等），以现有 React + Zustand + Vite 为基础演进。
  - 尽量通过「拆分文件 + 纯函数」获得清晰度，而不是增加抽象层数。
- **可渐进实施**：
  - 虽然可以一次性重排，但方案按阶段拆解，随时可以在阶段边界停下，避免半成品状态。
- **测试护航**：
  - 每一个阶段至少保持 `npm run lint` / `npm run test` / `npm run test:bench` 通过。

---

## 1. 目标架构总览

### 1.1 分层视图

从逻辑上把系统拆成 4 层：

1. **UI 层（React 组件）**
   - `App.tsx`：页面框架、布局、全局快捷键。
   - `PixelCanvas`, `MiniMap`, `HUD`, `Controls`, `Palette`, `ActionDock` 等：负责用户输入和渲染，不直接操作 WebSocket 或本地存储。

2. **应用层 / 用例层（Actions）**
   - 通过 `usePixelStore` 暴露的行为：`placePixel`、`fillSelection`、`connectWS`、`exportPNG` 等。
   - 强调「一个行为 = 一个清晰的副作用链路」（更新像素 → 标记 dirty → 持久化 → 可选广播）。

3. **领域层（Store Slices）**
   - 将当前单一的 `PixelStore` 划分为多个 slice：
     - `core`：像素矩阵、调色板、脏区、导出。
     - `history`：撤销栈和历史限制。
     - `viewport`：缩放/平移/居中。
     - `tools`：当前工具、选区、填充、吸管、冷却。
     - `uiPrefs`：网格、光标、提示等偏好。
     - `sharing`：本地持久化、分享链接。
     - `network`：WebSocket 状态与远端同步。

4. **基础设施层（Infra）**
   - `wsClient`：WebSocket 客户端和心跳机制。
   - `localStorage`、`window.location.hash` 访问封装。
   - 通用工具：颜色、数学、hash 编码等。

> 关键点：**store 仍然只有一个 `usePixelStore`**，只是内部通过 slices 和工具函数解耦不同职责。

### 1.2 目标目录结构（逻辑）

在保持 KISS 的前提下，阶段 1 只做「文件拆分 + utils 抽取」，不立刻调整顶层目录；阶段 2 作为可选的「feature-first 布局」。

**阶段 1：保守重构（推荐先做）**

```text
src/
  App.tsx              # 保持现有入口页面
  main.tsx             # React 入口
  components/
    PixelCanvas.tsx
    MiniMap.tsx
    HUD.tsx
    Controls.tsx
    Palette.tsx
    ActionDock.tsx
  store/
    usePixelStore.ts          # 重新组织为 slice 聚合
    pixel-core.slice.ts       # 新增：像素与调色板核心逻辑
    pixel-viewport.slice.ts   # 新增：缩放/视图
    pixel-history.slice.ts    # 新增：历史/撤销
    pixel-tools.slice.ts      # 新增：工具 & 选区 & 冷却
    pixel-ui-prefs.slice.ts   # 新增：网格、光标、提示
    pixel-sharing.slice.ts    # 新增：存档 & 分享
    pixel-network.slice.ts    # 新增：联机状态 & 远端同步
    pixel-types.ts            # 新增：PixelStore/Viewport 等共享类型
  services/
    wsClient.ts         # 保持文件名不变
  utils/
    color.ts            # 新增：hexToRgb / paletteToRGB 等
    math.ts             # 新增：clamp 等
    hash.ts             # 新增：分享链接编解码工具
    persistence.ts      # 新增：本地存档读写（包装 localStorage）
```

**阶段 2：特性（feature-first）布局（可选）**

如果后面引入更多页面/特性（例如大厅、观战、设置），可以进一步调整为：

```text
src/
  app/
    AppShell.tsx
    main.tsx
  features/
    pixel-board/
      components/
      state/
      services/
      utils/
```

短期内建议仍使用阶段 1 布局，避免「只剩一个 feature」时层级过深，违背 KISS。

---

## 2. 状态层重构：`usePixelStore` → slices

### 2.1 现状问题小结

- 单文件 `usePixelStore.ts` 同时承担：
  - 像素矩阵与历史、视图控制、工具/选区、持久化、分享链接、UI 偏好、WebSocket 同步。
- 结果：
  - 文件过长，认知成本高；
  - 各子领域之间的依赖边界不直观；
  - 未来改动（尤其是联机、可变画布）风险大。

### 2.2 目标：slice 设计

在不改变对外 API（`usePixelStore(selector)` 调用方式不变）的前提下，将逻辑拆成多个 slice 工厂：

- **`pixel-core.slice.ts`**
  - 状态：`width` `height` `pixels` `palette` `paletteRGB` `version` `dirty` `fullRedraw`。
  - 动作：`consumeDirty` `getPixel` `clear` `exportPNG` `exportJSON` `importJSON`。
  - 依赖：
    - 工具函数：`clamp`、`paletteToRGB`（来自 `utils`）。
    - 持久化接口（通过 `persistence.ts` 调用 `localStorage`）。

- **`pixel-history.slice.ts`**
  - 状态：`history` `historyLimit`。
  - 动作：`undo` `setHistoryLimit`。
  - 依赖：
    - 需要访问 `pixels`（来自 `pixel-core`）以回滚某个 index。

- **`pixel-viewport.slice.ts`**
  - 状态：`viewport` `{ scale, offsetX, offsetY }`、`canvasW`、`canvasH`。
  - 动作：`setCanvasSize` `setViewport` `panBy` `setScale` `centerOn`。

- **`pixel-tools.slice.ts`**
  - 状态：`tool` `selection` `cooldownMs` `lastPlacedAt` `selected`。
  - 动作：
    - `setTool`、`startSelection`、`updateSelection`、`clearSelection`、`fillSelection`；
    - `canPlace`、`placePixel`、`pickColor`、`setSelected`。
  - 依赖：
    - 写入像素缓冲（`pixels`）和历史（`history`）；
    - 通知脏区列表（`dirty`）；
    - 联机广播（通过网络 slice 提供的 `sendPlace` / `sendFillRect` 适配函数）。

- **`pixel-ui-prefs.slice.ts`**
  - 状态：`showGrid` `gridColor` `gridAlpha` `gridMinScale` `cursorStyle` `cursorColor` `cursorCooldownColor` `cursorPipetteColor` `showCursorHints`。
  - 动作：对应的 setter（`setGridColor` 等）。

- **`pixel-sharing.slice.ts`**
  - 状态：无新增，只复用其他 slice 的状态；
  - 动作：`save` `load` `exportHash` `applyHash`。
  - 依赖：
    - `persistence.ts`（封装 localStorage）；
    - `hash.ts`（负责对象 <-> base64 hash 的转换）。

- **`pixel-network.slice.ts`**
  - 状态：`wsEnabled` `wsUrl` `wsStatus` `wsError` `wsLastHeartbeat` `authoritativeMode` `pendingOps`。
  - 动作：`setWsUrl` `connectWS` `disconnectWS` `applyRemotePixels` `setAuthoritativeMode`。
  - 依赖：
    - `wsClient` 实例（通过依赖注入）；
    - 像素写入（用于应用远端 diff）；
    - 历史 & 脏区（在权威模式下回滚未确认操作）。

### 2.3 slice 聚合方式

- 在 `pixel-types.ts` 中定义 `PixelStore` 接口，拆成多个子接口：
  - `PixelCoreState`、`PixelHistoryState`、`PixelViewportState`、`PixelToolsState`、`PixelUiPrefsState`、`PixelSharingState`、`PixelNetworkState`，最终通过交叉类型组合。
- 在 `usePixelStore.ts` 中：
  - 声明依赖项：`PixelStoreDeps = { wsClient?: WSClient; storage?: StorageLike; now?: () => number }`；
  - 实现 `createPixelStoreState(deps)`，内部依次调用各 slice 工厂，将 `set/get` 及依赖透传；
  - 导出：
    - `createPixelStore(deps?)`：vanilla store；
    - `usePixelStore`：React hook（默认依赖真实 `wsClient` 和 `window.localStorage`）。

> 这一层重构完成后，对组件层的改动应为 0（或近似 0），以便单独验证。

---

## 3. 基础设施与工具函数重构

### 3.1 `utils/color.ts`

- 提取：
  - `hexToRgb(hex: string): [number, number, number]`（当前在多个文件中重复实现）。
  - `paletteToRGB(palette: string[]): Uint8ClampedArray`（store 中已有，可迁移）。
- 使用方：
  - `usePixelStore`（构建 `paletteRGB`）。
  - `PixelCanvas` / `MiniMap`（绘制网格和像素时的颜色转换）。

### 3.2 `utils/math.ts`

- 提取：`clamp(v, min, max)`。
- 使用方：
  - store 中的坐标与缩放限制；
  - Canvas/MiniMap 计算视窗裁剪；
  - 网格缩放最小值等。

### 3.3 `utils/hash.ts`

- 职责：
  - `encodeViewStateToHash(state): string` → `#pb=...`；
  - `decodeHashToViewState(hash): Parsed | null`。
- `usePixelStore` 中的 `exportHash` / `applyHash` 改为调用这些工具函数，避免在 store 内部直接处理 base64 与 `decodeURIComponent/escape`。

### 3.4 `utils/persistence.ts`

- 封装 localStorage 操作：
  - `loadPixels(key)`, `savePixels(key, payload)`，内部处理 JSON.parse/JSON.stringify 异常与兼容性。
- 好处：
  - 便于在测试中注入内存实现；
  - 将存档格式（`{ w, h, b64, palette, s }`）集中描述，未来如需版本迁移更易维护。

### 3.5 `services/wsClient.ts`

- 保持现有设计（心跳、重连、回调）不变，仅做小范围整理：
  - 将 `ServerMessage` 类型导出给 `pixel-network.slice.ts` 复用；
  - 在重构 plan 中记录：未来可考虑使用 runtime schema 校验（例如 Zod），但本轮重构不强制实施。

---

## 4. 组件层重构

### 4.1 App 壳与快捷键

- 现状：
  - `App.tsx` 直接在组件内部使用 `useEffect` 监听 `window.keydown` / `hashchange`，并操作 store。
- 目标：
  - 保持 `App.tsx` 文件不拆分，只对内部逻辑做小幅整理：
    - 为键盘映射定义一份表结构（例如「键 → 行为描述」），便于未来出文档/可视化帮助；
    - 保持所有快捷键最终都调用 store 的行为（`undo`、`setScale`、`setShowGrid`、`setTool` 等）。
- 可选：
  - 若未来页面增多，可以新增 `app/AppShell.tsx`，让 `App.tsx` 只作为像素工作室这一页，键盘监听统一挂在 `AppShell` 上。

### 4.2 PixelCanvas 输入处理

- 现状：
  - `PixelCanvas` 内聚了所有鼠标/触摸/滚轮事件；通过 `usePixelStore.getState()` 调用 store 行为。
- 重构建议：
  - 保持「事件都在 Canvas 里」的策略不变，以避免分散逻辑；
  - 仅对内部逻辑做以下整理：
    - 把指针状态变量（`isPanning`/`isDrawing`/`isSelecting` 等）整理成一个小的内部状态对象，减少全局局部变量；
    - 将触控手势（pinch/long press）相关逻辑提取为若干小函数，提升可读性；
    - 删除重复计算（例如多处 `canvas.getBoundingClientRect()` 可适当缓存到局部函数）。

### 4.3 MiniMap / HUD / Controls / Palette

- 重构重点不在这些组件，更多是「跟随 store API 的拆分」：
  - 当 store 拆分为 slices 后，这些组件只需更新 import 路径和 selector（如有类型命名变化）。
  - 可以顺便做一点小优化：
    - 为 Controls 中的按钮组提取复用的 button/section 样式到局部小组件或常量，避免 className 文本重复（目前已基本做到，可保持）。

---

## 5. 渐进迁移步骤

### 阶段 A：工具与 slice 准备（低风险）

1. **抽取 `utils` 工具函数**：
   - 新增 `utils/color.ts`、`utils/math.ts`、`utils/hash.ts`、`utils/persistence.ts`；
   - 将 `usePixelStore` / `PixelCanvas` / `MiniMap` 中的重复函数替换为公共实现；
   - 运行 `npm run lint && npm run test && npm run test:bench` 验证。

2. **定义 `pixel-types.ts`**：
   - 将当前 `PixelStore` 类型拆成多个子接口并组合；
   - 不改动实现，仅调整类型定义；
   - 再次运行测试脚本，确保类型与实现一致。

### 阶段 B：`usePixelStore` 内部重组（中风险）

1. **新增各个 slice 文件**，复制现有逻辑：
   - 在 `pixel-*.slice.ts` 中实现对应状态与 action，但先不改 `usePixelStore` 的对外 API；
   - 每完成一个 slice，立刻调整 `usePixelStore` 的实现改用该 slice；
   - 逐步删除旧的内联逻辑，直到 `usePixelStore.ts` 只剩下：
     - 依赖注入；
     - slice 聚合；
     - 默认导出。

2. **恢复并加强测试**：
   - 利用现有 `usePixelStore.test.ts` 和 `usePixelStore.performance.test.ts`，按阶段 B 每个子任务执行一次完整测试；
   - 如有必要，为新 slice 补充更细粒度的单元测试（尤其是 `network` 和 `sharing` 部分）。

### 阶段 C：小幅组件整理与清理（低风险）

1. **App 快捷键映射整理**：
   - 将 `useEffect` 中的快捷键常量化（例如 `const KEY_BINDINGS = [...]`），方便文档与后续维护；
   - 保证行为不变。

2. **PixelCanvas 内部代码清理**：
   - 提取触控/鼠标处理的局部函数；
   - 确认 `ResizeObserver` / `requestAnimationFrame` 生命周期无泄漏（目前逻辑已经较好，此步主要是代码可读性提升）。

> 若需要更进一步的目录重排（阶段 2 feature-first 布局），建议在上述阶段全部完成、测试稳定后再单独执行，并作为一次专门的重构提交。

---

## 6. 验收与回归测试

### 6.1 自动化

- 每个阶段的完成标志：
  - `npm run lint` 通过（无新增 warning/error）；
  - `npm run test` 全部通过；
  - `npm run test:bench` 在基线文档允许范围内（若有明显波动，需要在 `docs/stage0-baseline.md` 里记录原因）。

### 6.2 手工回归 Checklist

- **桌面端**：
  - 左键画点，右键拖拽，滚轮缩放；
  - Alt 吸管、Ctrl+Z 撤销；
  - B 切画笔、M 切选框，F 填充选区，Esc 取消；
  - 迷你地图点击跳转视角；
  - 导出 PNG/JSON 与导入 JSON；
  - 复制分享链接、刷新后通过 URL 恢复视角；
  - 输入 WebSocket 地址并连接，验证远端同步逻辑（如有可用后端）。

- **移动端**（可用 DevTools 模拟）：
  - 单指拖拽、双指缩放、长按吸管；
  - 轻触落点放置像素。

---

## 7. 后续扩展预留

本次重构完成后，可较低成本地实现：

1. **可变画布尺寸**
   - 将 `width/height` 逻辑集中在 `pixel-core.slice` 中，使之支持配置；
   - 通过 `PixelStoreDeps` 注入默认尺寸，或引入「房间配置」。

2. **观战模式与回放**
   - 在 `pixel-network.slice` 中扩展：
     - 支持只读模式（禁用 `placePixel`/`fillSelection`）；
     - 复用 `applyRemotePixels` 做回放。

3. **多语言与主题**
   - 将 UI 文案抽离成资源对象；
   - 将网格/光标主题配置抽象为「主题 profile」，可在设置页面切换。

---

## 8. 实施建议

- 将本方案拆成若干 PR，每个阶段尽量只做一类变更：
  - `feat(utils): extract color/math/hash helpers`
  - `refactor(store): split pixel store into slices`
  - `refactor(components): tidy App shortcuts & PixelCanvas`
- 每个 PR 保持可回滚：即任何一个 PR 合并后，项目仍可独立运行，通过完整测试。
- 所有重构相关提交在 `changelog/` 中追加记录（本次文档即为第一条），方便回顾架构演进历史。
