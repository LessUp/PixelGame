import usePixelStore from '../store/usePixelStore'
import { Button } from './ui/Button'
import { 
  Undo2, 
  Save, 
  ImageDown, 
  Grid3X3, 
  Pencil, 
  BoxSelect, 
  PaintBucket
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../utils/cn'

function downloadPNG(exportPNG: () => string) {
  const url = exportPNG()
  const a = document.createElement('a')
  a.href = url
  a.download = `pixel-art-${Date.now()}.png`
  a.click()
  toast.success('Snapshot saved')
}

export default function ActionDock() {
  const undo = usePixelStore(s => s.undo)
  const save = usePixelStore(s => s.save)
  const showGrid = usePixelStore(s => s.showGrid)
  const setShowGrid = usePixelStore(s => s.setShowGrid)
  const exportPNG = usePixelStore(s => s.exportPNG)
  const tool = usePixelStore(s => s.tool)
  const setTool = usePixelStore(s => s.setTool)
  const selection = usePixelStore(s => s.selection)
  const fillSelection = usePixelStore(s => s.fillSelection)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-border bg-card/80 p-2 shadow-lg backdrop-blur-md transition-all hover:scale-[1.02]">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => { undo(); toast.info('Undid last action') }} 
          title="Undo (Ctrl+Z)" 
          className="rounded-xl"
        >
          <Undo2 className="h-5 w-5" />
        </Button>
        
        <div className="h-6 w-px bg-border mx-1" />

        <Button 
          variant={tool === 'paint' ? 'primary' : 'ghost'} 
          size="icon" 
          onClick={() => setTool('paint')} 
          title="Paint (B)"
          className="rounded-xl"
        >
          <Pencil className="h-5 w-5" />
        </Button>

        <Button 
          variant={tool === 'selectRect' ? 'primary' : 'ghost'} 
          size="icon" 
          onClick={() => setTool('selectRect')} 
          title="Select (M)"
          className="rounded-xl"
        >
          <BoxSelect className="h-5 w-5" />
        </Button>

        <Button 
          variant="ghost"
          size="icon"
          disabled={!selection}
          onClick={() => { selection && fillSelection(); toast.success('Filled selection') }}
          title="Fill Selection (F)"
          className={cn(
            "rounded-xl",
            selection && "text-primary hover:text-primary hover:bg-primary/10"
          )}
        >
          <PaintBucket className="h-5 w-5" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <Button 
          variant={showGrid ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setShowGrid(!showGrid)} 
          title="Toggle Grid (G)"
          className="rounded-xl"
        >
          <Grid3X3 className="h-5 w-5" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => { save(); toast.success('Saved') }} 
          title="Quick Save" 
          className="rounded-xl"
        >
          <Save className="h-5 w-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => downloadPNG(exportPNG)} 
          title="Export PNG" 
          className="rounded-xl"
        >
          <ImageDown className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
