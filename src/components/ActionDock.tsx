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
  a.download = 'pixel-board.png'
  a.click()
  toast.success('图片导出成功')
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
      <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-2.5 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all hover:bg-slate-900/90 hover:scale-[1.02] hover:border-white/20">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { undo(); toast.info('已撤销') }} 
            title="撤销 (Ctrl+Z)" 
            className="rounded-xl hover:scale-110 transition-transform hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
          
          <div className="h-8 w-px bg-white/10 mx-1" />

          <Button 
            variant={tool === 'paint' ? 'primary' : 'ghost'} 
            size="icon" 
            onClick={() => setTool('paint')} 
            title="画笔模式 (B)"
            className={cn(
              "rounded-xl transition-all hover:scale-110 relative group",
              tool === 'paint' ? "bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]" : "text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Pencil className="h-5 w-5" />
            {tool === 'paint' && <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/50" />}
          </Button>

          <Button 
            variant={tool === 'selectRect' ? 'primary' : 'ghost'} 
            size="icon" 
            onClick={() => setTool('selectRect')} 
            title="选框模式 (M)"
            className={cn(
              "rounded-xl transition-all hover:scale-110 relative group",
              tool === 'selectRect' ? "bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]" : "text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            <BoxSelect className="h-5 w-5" />
            {tool === 'selectRect' && <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/50" />}
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            disabled={!selection}
            onClick={() => { selection && fillSelection(); toast.success('选区已填充') }}
            title="填充当前选区 (F)"
            className={cn(
              "rounded-xl transition-all hover:scale-110",
              !selection ? 'opacity-30' : 'text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
            )}
          >
            <PaintBucket className="h-5 w-5" />
          </Button>

          <div className="h-8 w-px bg-white/10 mx-1" />

          <Button 
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setShowGrid(!showGrid)} 
            title="网格开关 (G)"
            className={cn(
               "rounded-xl transition-all hover:scale-110",
               showGrid ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>

          <div className="h-8 w-px bg-white/10 mx-1" />

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { save(); toast.success('已保存') }} 
            title="快速保存" 
            className="rounded-xl hover:scale-110 transition-transform hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <Save className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => downloadPNG(exportPNG)} 
            title="导出图片" 
            className="rounded-xl hover:scale-110 transition-transform hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <ImageDown className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
