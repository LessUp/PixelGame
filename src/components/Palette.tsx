import usePixelStore from '../store/usePixelStore'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Palette as PaletteIcon } from 'lucide-react'
import { cn } from '../utils/cn'

export default function Palette() {
  const palette = usePixelStore(s => s.palette)
  const selected = usePixelStore(s => s.selected)
  const setSelected = usePixelStore(s => s.setSelected)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>调色板</CardTitle>
        <PaletteIcon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-900/50 p-3">
          <div
            className="h-10 w-10 rounded-lg border border-white/10 shadow-lg shadow-slate-950/20 ring-2 ring-white/5"
            style={{ backgroundColor: palette[selected] }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-400">当前颜色</span>
            <span className="font-mono text-sm font-bold text-slate-200 tracking-wider">{palette[selected]}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-8 gap-2">
          {palette.map((c, i) => (
            <button
              key={i}
              className={cn(
                "relative aspect-square rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/70",
                i === selected
                  ? 'border-white/90 shadow-lg shadow-sky-500/20 scale-110 z-10 ring-2 ring-black/50'
                  : 'border-white/5 hover:scale-105 hover:border-white/30 hover:shadow-md hover:z-10'
              )}
              style={{ backgroundColor: c }}
              onClick={() => setSelected(i)}
              aria-label={`选择颜色 ${i}`}
              title={`颜色 ${i}: ${c}`}
            >
              {i === selected && (
                <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/20" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
