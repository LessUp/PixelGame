# 阶段 0 基线（性能 · 交互 · 状态）

> 更新时间：2025-11-12T02:30:13+08:00，Node.js v22.17.0 / npm 10.9.2，`npm install` 后首次运行。

## 1. 自动化性能基线

| 指标 | 描述 | 运行命令 | 用时 (s) | 备注 |
| --- | --- | --- | --- | --- |
| Lint | ESLint 9.36 扫描全部源文件与配置 | `npm run lint` | **1.902** | 未启用缓存；以 `eslint.config.js` 为准 |
| 单元测试 | Vitest shim + jsdom mock 覆盖 store 导入导出与工具链 | `npm run test` | **0.586** | 6/6 通过；包含 PNG/JSON/hash round-trip |
| 性能基准 | Vitest performance suite，校验 `consumeDirty` 与全量重绘耗时 | `npm run test:bench` | **0.249** | 默认阈值：`consumeDirty` < 20µs/像素批；全局重绘 < 40 ms |

**采集方法**：`TIMEFORMAT='%3Rs'; time <command>`。如需比较多次结果，请至少运行 3 次并取中位数。

## 2. 交互体验基线

| 用户任务 | 关键步骤 | 期望反馈 | 度量/采集方式 |
| --- | --- | --- | --- |
| 画布首屏可互动 | 加载应用 → 完成首帧渲染 | ≤2.5 s 内可拖拽/放置 | DevTools Performance → Interaction to Next Paint |
| 放置像素 | 左键点击或触屏轻点 → `placePixel` | 操作至像素可见 ≤100 ms；冷却提示即时更新 | FPS HUD + Performance markers |
| 拖拽/缩放画布 | 右键拖/滚轮缩放/双指缩放 | 手势持续 60 fps；惯性或阻尼稳定 | Chrome DevTools → FPS meter |
| 移动端吸管 | 长按/双指轻点 → `pickColor` | 200 ms 内 HUD 显示新颜色 | 录屏 + DevTools sensors |
| 导出内容 | 点击 PNG/JSON/分享链接按钮 | 500 ms 内完成导出并弹出提示 | Performance → User Timing |

> 当新增交互（如双击缩放、拖拽阻尼）时，以上表格需添加对应行并记录目标指标与采集手段。

## 3. `usePixelStore` 状态分层

| 分层 | 关键字段 | 职责 | Side Effects |
| --- | --- | --- | --- |
| Canvas/像素缓冲 | `width` `height` `pixels` `dirty` `fullRedraw` | 管理 1024×1024 像素矩阵与脏区 | `save()`、`exportPNG/JSON`、`consumeDirty()` |
| 视图/交互 | `viewport` `canvasW` `canvasH` `setScale` `panBy` | 处理缩放、平移、居中 | 更新 `viewport` + 触发渲染层重算 |
| 工具与选择 | `tool` `selection` `startSelection` `fillSelection` | 管理画笔/选框、批量填充 | 写像素缓冲、推入 `history`、调用 `socket.sendFillRect` |
| 历史/撤销 | `history` `historyLimit` `undo` | 记录像素修改链路 | 变更 `pixels` 并重绘 |
| 持久化 | `save` `load` `exportHash` `applyHash` | localStorage 存档、分享链接 | 读写 localStorage / `window.location.hash` |
| WebSocket | `wsEnabled` `wsUrl` `wsStatus` `connectWS` `applyRemotePixels` | 连接实时后端、应用远端 diff | 调用 `wsClient`、批量写像素 |
| UI 偏好 | `showGrid` `gridColor` `gridAlpha` `gridMinScale` | 网格及 UI 偏好 | 影响画布渲染策略 |

该分层为后续「可变画布」「观战模式」提供解耦基础：例如可以把 Canvas/History 抽成独立 zustand slice，再以依赖注入方式接入 `wsClient`。

## 4. 操作流程图（ASCII）

```
[用户输入] ─┐
            v
   PixelCanvas 事件处理
            v
   usePixelStore.placePixel
            v
[像素缓冲更新] ──> [history.push]
            │
            ├─> dirty[] 打标 → render loop → 画布补绘
            └─> wsClient.sendPlacePixel → (可选) 服务端广播
```

```
[用户拖拽选区] → startSelection/updateSelection
        │
        ├─填充按钮/F 快捷键
        v
  fillSelection
        v
  批量写像素 → history.push → dirty[] (<=10k)
        │
        └─socket.sendFillRect(x0,y0,x1,y1,color)
```

```
[导出 JSON/PNG] ──> exportJSON/exportPNG
         │                  │
         ├─ JSON.stringify  └─ Canvas + ImageData
         v
  下载/复制 UI 提示
```

```
[输入 WS 地址] → setWsUrl → connectWS
        │                      │
        │                wsClient.connect()
        │                      │
        ├─ onOpen  → wsStatus=connected → HUD 心跳
        ├─ onMessage → applyRemotePixels → pixels/dirty
        └─ onError/onClose → wsStatus=error/disconnected → 退避重连
```

## 5. 后续跟踪

- 每次合并前记录上述三条命令的耗时，超过 ±10% 需添加备注（代码变更、依赖升级等）。
- 交互指标建议通过「每周冒烟 + 每月深度」的频率更新，并写入本文件。
- 若新增状态字段或重构 `usePixelStore`，同步更新「状态分层」表格，保持开发/设计共享的心智模型一致。
