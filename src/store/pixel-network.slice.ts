import type { StateCreator } from 'zustand'
import type { PixelStore } from './pixel-types'
import type { ServerMessage, PixelUpdate } from '../services/wsClient'

export type PixelNetworkSocket = {
  connect: (url: string, callbacks: {
    onOpen?: () => void
    onClose?: (ev?: CloseEvent) => void
    onError?: (message: string, ev?: Event | CloseEvent | ErrorEvent) => void
    onReconnect?: (attempt: number, delay: number) => void
    onMessage?: (msg: ServerMessage) => void
    onHeartbeat?: (timestamp: number, rtt?: number) => void
  }) => boolean
  disconnect: () => void
}

export const createPixelNetworkSlice = (
  socket: PixelNetworkSocket,
): StateCreator<PixelStore, [], []> => (set, get) => ({
  wsEnabled: false,
  wsUrl: '',
  wsStatus: 'disconnected',
  wsError: null,
  wsLastHeartbeat: null,
  authoritativeMode: false,
  pendingOps: [],
  setWsUrl: (url: string) => set({ wsUrl: url.trim() }),
  connectWS: (url) => {
    const target = (url || get().wsUrl).trim()
    if (!target) {
      set({ wsError: '请先输入服务器地址', wsStatus: 'error' })
      return
    }
    set({ wsUrl: target, wsStatus: 'connecting', wsError: null })
    try {
      const connected = socket.connect(target, {
        onOpen: () => set({ wsEnabled: true, wsStatus: 'connected', wsError: null, wsLastHeartbeat: Date.now() }),
        onClose: () => set((state) => ({ wsEnabled: false, wsStatus: state.wsStatus === 'connecting' ? 'connecting' : 'disconnected' })),
        onError: (message) => {
          set({ wsEnabled: false, wsStatus: 'error', wsError: message || 'WebSocket 连接异常' })
        },
        onReconnect: () => set({ wsStatus: 'connecting' }),
        onHeartbeat: (timestamp) => set({ wsLastHeartbeat: timestamp, wsStatus: 'connected' }),
        onMessage: (msg) => {
          try {
            get().applyRemotePixels(msg)
          } catch (err) {
            console.warn('[ws] 处理消息失败', err)
          }
        },
      })
      if (!connected) {
        set({ wsEnabled: false, wsStatus: 'error', wsError: '当前环境不支持 WebSocket' })
      }
    } catch (err) {
      console.error('[ws] 连接失败', err)
      set({ wsEnabled: false, wsStatus: 'error', wsError: '连接 WebSocket 时发生异常' })
    }
  },
  disconnectWS: () => {
    try {
      socket.disconnect()
    } catch (err) {
      console.warn('[ws] 主动断开时发生异常', err)
    }
    set({ wsEnabled: false, wsStatus: 'disconnected' })
  },
  applyRemotePixels: (payload) => {
    if (!payload) return

    const applyBatch = (list: PixelUpdate[]) => {
      if (!Array.isArray(list) || !list.length) return
      const d = get().dirty
      let changed = false
      for (const it of list) {
        const x = it.x | 0
        const y = it.y | 0
        const c = it.c | 0
        if (x < 0 || y < 0 || x >= get().width || y >= get().height) continue
        const idx = y * get().width + x
        const prev = get().pixels[idx]
        if (prev !== c) {
          get().pixels[idx] = c
          if (d.length < 10000) d.push(idx)
          changed = true
        }
      }
      if (changed) set({ version: get().version + 1, dirty: d })
      if (get().authoritativeMode) {
        const width = get().width
        const pend = get().pendingOps
        if (pend.length) {
          const keep = pend.filter(op => !list.some(it => (it.y * width + it.x) === op.idx && get().pixels[op.idx] === it.c))
          if (keep.length !== pend.length) set({ pendingOps: keep })
        }
      }
    }

    if (Array.isArray(payload)) {
      applyBatch(payload)
      return
    }

    const msg = payload as ServerMessage
    switch (msg.t) {
      case 'place': {
        const { x, y, c } = msg as Extract<ServerMessage, { t: 'place' }>
        applyBatch([{ x, y, c }])
        break
      }
      case 'multi':
      case 'batch':
      case 'pixels':
        applyBatch(Array.isArray(msg.list) ? msg.list : [])
        break
      case 'fillRect': {
        const { x0, y0, x1, y1, c } = msg as Extract<ServerMessage, { t: 'fillRect' }>
        const d = get().dirty
        let changed = false
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            if (x < 0 || y < 0 || x >= get().width || y >= get().height) continue
            const idx = y * get().width + x
            const prev = get().pixels[idx]
            if (prev !== c) {
              get().pixels[idx] = c
              if (d.length < 10000) d.push(idx)
              changed = true
            }
          }
        }
        if (changed) set({ version: get().version + 1, dirty: d })
        if (get().authoritativeMode) {
          const pend = get().pendingOps
          if (pend.length) {
            const keep = pend.filter(op => {
              const x = op.idx % get().width
              const y = (op.idx / get().width) | 0
              const inRect = x >= x0 && x <= x1 && y >= y0 && y <= y1
              return !(inRect && get().pixels[op.idx] === c)
            })
            if (keep.length !== pend.length) set({ pendingOps: keep })
          }
        }
        break
      }
      case 'pong':
      case 'heartbeat':
      case 'hb':
      case 'ack':
        set({ wsLastHeartbeat: Date.now(), wsStatus: 'connected' })
        break
      case 'error': {
        const message = typeof msg.message === 'string' ? msg.message : '服务器返回错误'
        console.error('[ws] 服务器错误', msg)
        set({ wsError: message, wsStatus: 'error' })
        if (get().authoritativeMode) {
          const pend = get().pendingOps
          if (pend.length) {
            const d = get().dirty
            for (const op of pend) {
              get().pixels[op.idx] = op.prev
              if (d.length < 10000) d.push(op.idx)
            }
            set({ version: get().version + 1, dirty: d, pendingOps: [] })
            get().save()
          }
        }
        break
      }
      case 'denied':
      case 'forbidden': {
        const reason = 'reason' in msg ? msg.reason : undefined
        const message = typeof msg.message === 'string'
          ? msg.message
          : typeof reason === 'string'
            ? reason
            : '权限不足'
        console.warn('[ws] 权限不足', msg)
        set({ wsError: message, wsStatus: 'error' })
        if (get().authoritativeMode) {
          const pend = get().pendingOps
          if (pend.length) {
            const d = get().dirty
            for (const op of pend) {
              get().pixels[op.idx] = op.prev
              if (d.length < 10000) d.push(op.idx)
            }
            set({ version: get().version + 1, dirty: d, pendingOps: [] })
            get().save()
          }
        }
        break
      }
      default:
        console.debug('[ws] 未识别的消息类型', msg)
    }
  },
})
