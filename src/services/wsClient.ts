const HEARTBEAT_INTERVAL = 15000
const HEARTBEAT_TIMEOUT = 5000
const BASE_RECONNECT_DELAY = 1500
const MAX_RECONNECT_DELAY = 15000

export type PixelUpdate = { x: number; y: number; c: number }

export type ServerMessage =
  | { t: 'place'; x: number; y: number; c: number }
  | { t: 'fillRect'; x0: number; y0: number; x1: number; y1: number; c: number }
  | { t: 'multi' | 'batch' | 'pixels'; list: PixelUpdate[] }
  | { t: 'pong' | 'heartbeat' | 'hb' | 'ack'; [key: string]: unknown }
  | { t: 'ping'; [key: string]: unknown }
  | { t: 'error'; message?: string; code?: string }
  | { t: 'denied' | 'forbidden'; message?: string; reason?: string; code?: string }
  | { t: string; [key: string]: unknown }

export type ConnectCallbacks = {
  onOpen?: () => void
  onClose?: (ev?: CloseEvent) => void
  onError?: (message: string, ev?: Event | CloseEvent | ErrorEvent) => void
  onReconnect?: (attempt: number, delay: number) => void
  onMessage?: (msg: ServerMessage) => void
  onHeartbeat?: (timestamp: number, rtt?: number) => void
  onLog?: (level: 'info' | 'warn' | 'error', message: string, extra?: unknown) => void
}

class WSClient {
  private ws: WebSocket | null = null
  private url: string | null = null
  private callbacks: ConnectCallbacks | null = null
  private manualClose = false
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private heartbeatTimeoutTimer: number | null = null
  private reconnectAttempt = 0
  private lastPingSentAt: number | null = null

  connect(url: string, callbacks: ConnectCallbacks = {}): boolean {
    if (this.ws) {
      try {
        this.ws.onopen = null
        this.ws.onclose = null
        this.ws.onmessage = null
        this.ws.onerror = null
        const prev = this.ws
        this.ws = null
        prev.close()
      } catch (err) {
        this.log('warn', '关闭旧的 WebSocket 连接失败', err)
      }
    }
    this.stopHeartbeat()
    this.clearReconnectTimer()

    this.callbacks = callbacks
    this.url = url
    this.manualClose = false
    this.reconnectAttempt = 0

    if (typeof WebSocket === 'undefined') {
      this.log('error', '当前环境不支持 WebSocket，已切换至离线模式')
      callbacks.onError?.('当前环境不支持 WebSocket')
      return false
    }

    this.open()
    return true
  }

  disconnect(): void {
    this.manualClose = true
    this.stopHeartbeat()
    this.clearReconnectTimer()
    if (this.ws) {
      try { this.ws.close() } catch (err) {
        this.log('warn', '关闭 WebSocket 连接时出现异常', err)
      }
    }
    this.ws = null
  }

  sendPlacePixel(x: number, y: number, c: number): boolean {
    return this.send({ t: 'place', x, y, c })
  }

  sendFillRect(x0: number, y0: number, x1: number, y1: number, c: number): boolean {
    return this.send({ t: 'fillRect', x0, y0, x1, y1, c })
  }

  send(payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    try {
      this.ws.send(JSON.stringify(payload))
      return true
    } catch (err) {
      this.log('warn', '发送 WebSocket 消息失败', err)
      return false
    }
  }

  private open(): void {
    const target = this.url
    if (!target) return

    this.stopHeartbeat()

    let instance: WebSocket
    try {
      instance = new WebSocket(target)
    } catch (err) {
      this.log('error', '创建 WebSocket 连接失败', err)
      this.callbacks?.onError?.('创建 WebSocket 连接失败')
      this.scheduleReconnect()
      return
    }

    this.ws = instance

    instance.onopen = () => {
      if (this.ws !== instance) return
      this.log('info', `WebSocket 已连接: ${target}`)
      this.reconnectAttempt = 0
      this.manualClose = false
      this.startHeartbeat()
      this.callbacks?.onOpen?.()
    }

    instance.onerror = (ev) => {
      if (this.ws !== instance) return
      this.log('warn', 'WebSocket 发生错误', ev)
      this.callbacks?.onError?.('WebSocket 发生错误', ev)
    }

    instance.onclose = (ev) => {
      if (this.ws !== instance) return
      this.log('warn', 'WebSocket 连接已关闭', ev)
      this.stopHeartbeat()
      this.ws = null
      this.callbacks?.onClose?.(ev)
      if (!this.manualClose) {
        this.scheduleReconnect()
      }
    }

    instance.onmessage = (ev) => {
      if (this.ws !== instance) return
      if (typeof ev.data === 'string') {
        this.processMessage(ev.data)
      } else if (ev.data instanceof Blob) {
        ev.data.text().then((text) => this.processMessage(text)).catch((err) => {
          this.log('warn', '解析二进制 WebSocket 消息失败', err)
        })
      } else {
        this.log('warn', '收到未知类型的 WebSocket 消息', ev.data)
      }
    }
  }

  private processMessage(text: string): void {
    let msg: ServerMessage
    try {
      msg = JSON.parse(text)
    } catch (err) {
      this.log('warn', '解析 WebSocket 消息失败', err)
      return
    }

    if (!msg || typeof msg !== 'object') return

    if (msg.t === 'pong' || msg.t === 'heartbeat' || msg.t === 'hb' || msg.t === 'ack') {
      this.markHeartbeat()
    } else if (msg.t === 'ping') {
      // Respond to server heartbeat
      this.send({ t: 'pong' })
      this.markHeartbeat()
    }

    if (msg.t === 'error') {
      const message = typeof msg.message === 'string' ? msg.message : '服务器返回错误'
      this.callbacks?.onError?.(message)
      this.log('error', message, msg)
    }

    if (msg.t === 'denied' || msg.t === 'forbidden') {
      const message = (msg.message || msg.reason || '权限不足') as string
      this.callbacks?.onError?.(message)
      this.log('warn', '权限受限', msg)
    }

    this.callbacks?.onMessage?.(msg)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL)
    this.sendHeartbeat()
  }

  private sendHeartbeat(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.lastPingSentAt = Date.now()
    this.send({ t: 'ping' })
    this.resetHeartbeatTimeout()
  }

  private markHeartbeat(): void {
    this.resetHeartbeatTimeout()
    const now = Date.now()
    const rtt = this.lastPingSentAt ? now - this.lastPingSentAt : undefined
    this.callbacks?.onHeartbeat?.(now, rtt)
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) window.clearTimeout(this.heartbeatTimeoutTimer)
    this.heartbeatTimeoutTimer = window.setTimeout(() => this.onHeartbeatTimeout(), HEARTBEAT_TIMEOUT)
  }

  private onHeartbeatTimeout(): void {
    this.log('warn', '心跳超时，准备重连')
    this.callbacks?.onError?.('心跳超时')
    if (this.ws) {
      try {
        this.ws.close()
      } catch (err) {
        this.log('warn', '关闭 WebSocket 连接时触发异常', err)
      }
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      window.clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose || !this.url) return
    this.reconnectAttempt += 1
    const delay = Math.min(BASE_RECONNECT_DELAY * this.reconnectAttempt, MAX_RECONNECT_DELAY)
    this.clearReconnectTimer()
    this.callbacks?.onReconnect?.(this.reconnectAttempt, delay)
    this.reconnectTimer = window.setTimeout(() => this.open(), delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, extra?: unknown) {
    if (this.callbacks?.onLog) {
      this.callbacks.onLog(level, message, extra)
    }
    const logger = console[level] || console.log
    try {
      if (extra !== undefined) {
        logger.call(console, `[ws] ${message}`, extra)
      } else {
        logger.call(console, `[ws] ${message}`)
      }
    } catch (err) {
      console.error('[ws] 输出日志失败', err)
    }
  }
}

const wsClient = new WSClient()

export default wsClient
