import { useEffect, useState } from 'react'
import usePixelStore from '../store/usePixelStore'
import { Activity, MousePointer2, ZoomIn, Palette } from 'lucide-react'
import { cn } from '../utils/cn'

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
  const isCooldown = left > 0

  const toolLabel = tool === 'selectRect' ? '选框 (M)' : '画笔 (B)'

  return (
    <div className="pointer-events-none absolute top-6 right-6 flex flex-col gap-3 select-none">
      {/* Main Status Card */}
      <div className="w-64 rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-slate-400">System Ready</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-sky-400">
            <ZoomIn className="h-3 w-3" />
            <span>{Math.round(scale * 100)}%</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-white/5 p-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Palette className="h-3.5 w-3.5 text-slate-500" />
              <span>Color</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-500">{palette[selected]}</span>
              <div 
                className="h-5 w-5 rounded border border-white/20 shadow-sm" 
                style={{ background: palette[selected] }} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-white/5 p-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <MousePointer2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Tool</span>
            </div>
            <span className="text-xs font-medium text-white">{toolLabel}</span>
          </div>

          <div className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2 transition-colors duration-300",
            isCooldown 
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' 
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          )}>
             <div className="flex items-center gap-2 text-xs">
               <Activity className="h-3.5 w-3.5" />
               <span>Status</span>
             </div>
             <span className="text-xs font-bold tracking-wide">
               {isCooldown ? `COOLING ${secs}s` : 'ACTIVE'}
             </span>
          </div>
        </div>
      </div>

      {/* Quick Hints */}
      <div className="self-end rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-sm">
        Left: Place · Right: Pan · Alt: Pick
      </div>
    </div>
  )
}
