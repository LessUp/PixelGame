# 2025-11-18 阶段B-6：拆分 network 与 sharing slices

## 变更
- 新增 `src/store/pixel-network.slice.ts`：
  - 封装 WebSocket 状态与行为：`wsEnabled`/`wsUrl`/`wsStatus`/`wsError`/`wsLastHeartbeat`/`authoritativeMode`/`pendingOps`。
  - 提供 `setWsUrl`/`connectWS`/`disconnectWS`/`applyRemotePixels`，复用原有逻辑并依赖注入 `socket`。
- 新增 `src/store/pixel-sharing.slice.ts`：
  - 管理持久化与分享：`save`/`load`/`clear`/`exportPNG`/`exportJSON`/`importJSON`/`exportHash`/`applyHash`。
  - 内部包含原有的 base64 编解码和 localStorage 访问逻辑。
- 调整 `src/store/usePixelStore.ts`：
  - 移除内联的 network/sharing 实现以及本地的 `u8ToB64`/`b64ToU8`/`STORAGE_KEY`。
  - 在 `createPixelStoreState` 中组合 `createPixelNetworkSlice(socket)` 与 `createPixelSharingSlice`，保持 `usePixelStore` 对外 API 不变。

## 测试
- 暂未执行（建议在本地运行：`npm run lint && npm run test && npm run test:bench`）。
