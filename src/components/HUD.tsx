import { useEffect, useState } from 'react'
import usePixelStore from '../store/usePixelStore'

export default function HUD() {
  const cooldownMs = usePixelStore(s => s.cooldownMs)
  const lastPlacedAt = usePixelStore(s => s.lastPlacedAt)
  const scale = usePixelStore(s => s.viewport.scale)
  const selected = usePixelStore(s => s.selected)
  const palette = usePixelStore(s => s.palette)

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [])

  const left = Math.max(0, cooldownMs - (now - lastPlacedAt))
  const secs = (left / 1000).toFixed(1)

  return (
    <div className="absolute top-2 right-2 text-xs bg-black/40 backdrop-blur rounded px-3 py-2 border border-white/10 text-white space-y-1 select-none">
      <div>缩放 ×{scale.toFixed(2)}</div>
      <div className="flex items-center gap-2">
        <span>当前色</span>
        <span className="w-4 h-4 rounded border border-white/40 inline-block" style={{ background: palette[selected] }} />
      </div>
      <div>{left > 0 ? `冷却 ${secs}s` : '可放置'}</div>
      <div className="text-white/70">左键放置 · 右键拖动 · 滚轮缩放 · Alt 吸管</div>
    </div>
  )
}
