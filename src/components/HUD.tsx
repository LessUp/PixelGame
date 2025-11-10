import { useEffect, useState } from 'react'
import usePixelStore from '../store/usePixelStore'

export default function HUD() {
  const cooldownMs = usePixelStore(s => s.cooldownMs)
  const lastPlacedAt = usePixelStore(s => s.lastPlacedAt)
  const scale = usePixelStore(s => s.viewport.scale)
  const selected = usePixelStore(s => s.selected)
  const palette = usePixelStore(s => s.palette)
  const tool = usePixelStore(s => s.tool)

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [])

  const left = Math.max(0, cooldownMs - (now - lastPlacedAt))
  const secs = (left / 1000).toFixed(1)

  const toolLabel = tool === 'selectRect' ? '选框 (M)' : '画笔 (B)'

  return (
    <div className="pointer-events-none absolute top-4 right-4 w-60 space-y-2 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-[0.72rem] text-slate-200 shadow-xl shadow-slate-950/60 backdrop-blur select-none">
      <div className="flex items-center justify-between text-[0.7rem] text-sky-200/80">
        <span className="font-semibold tracking-[0.25em] uppercase">状态面板</span>
        <span className="text-slate-400">×{scale.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>当前色</span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-lg border border-white/20 shadow-inner shadow-slate-900/60" style={{ background: palette[selected] }} />
      </div>
      <div className="flex items-center justify-between text-slate-300/80">
        <span>工具</span>
        <span>{toolLabel}</span>
      </div>
      <div className={`rounded-xl border px-3 py-1 text-center ${left > 0 ? 'border-amber-400/60 bg-amber-500/10 text-amber-200' : 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'}`}>
        {left > 0 ? `冷却 ${secs}s` : '可放置'}</div>
      <div className="text-[0.66rem] text-slate-400/80">左键放置 · 右键拖动 · 滚轮缩放 · Alt 吸管</div>
    </div>
  )
}
