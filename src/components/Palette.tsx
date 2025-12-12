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
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <PaletteIcon className="h-4 w-4 text-primary" /> Palette
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/50 p-3">
          <div
            className="h-10 w-10 rounded-md border border-border shadow-sm"
            style={{ backgroundColor: palette[selected] }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Selected Color</span>
            <span className="font-mono text-sm font-bold text-foreground tracking-wider">{palette[selected]}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-8 gap-1.5">
          {palette.map((c, i) => (
            <button
              key={i}
              className={cn(
                "relative aspect-square rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring",
                i === selected
                  ? 'border-white shadow-md scale-110 z-10 ring-2 ring-background'
                  : 'border-transparent hover:scale-105 hover:border-border/50'
              )}
              style={{ backgroundColor: c }}
              onClick={() => setSelected(i)}
              aria-label={`Select color ${i}`}
              title={`Color ${i}: ${c}`}
            >
              {i === selected && (
                <div className="absolute inset-0 rounded-md ring-1 ring-inset ring-black/10" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
