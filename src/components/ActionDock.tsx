import usePixelStore from '../store/usePixelStore'
import { Button } from './ui/Button'
import { 
  Undo2, 
  Save, 
  ImageDown, 
  Grid3X3, 
  Pencil, 
  BoxSelect, 
  PaintBucket,
  MousePointer2,
  ZoomIn
} from 'lucide-react'
import { toast } from 'sonner'

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
      <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-[2.5rem] border border-white/10 bg-slate-950/80 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all hover:bg-slate-950/90">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => { undo(); toast.info('已撤销') }} title="撤销 (Ctrl+Z)" className="rounded-full">
            <Undo2 className="h-5 w-5" />
          </Button>
          
          <div className="h-6 w-px bg-white/10 mx-1" />

          <Button 
            variant={tool === 'paint' ? 'primary' : 'ghost'} 
            size="icon" 
            onClick={() => setTool('paint')} 
            title="画笔模式 (B)"
            className="rounded-full"
          >
            <Pencil className="h-5 w-5" />
          </Button>

          <Button 
            variant={tool === 'selectRect' ? 'primary' : 'ghost'} 
            size="icon" 
            onClick={() => setTool('selectRect')} 
            title="选框模式 (M)"
            className="rounded-full"
          >
            <BoxSelect className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            disabled={!selection}
            onClick={() => { selection && fillSelection(); toast.success('选区已填充') }}
            title="填充当前选区 (F)"
            className={!selection ? 'opacity-30' : 'text-sky-400 hover:bg-sky-500/10 rounded-full'}
          >
            <PaintBucket className="h-5 w-5" />
          </Button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <Button 
            variant={showGrid ? 'primary' : 'ghost'}
            size="icon"
            onClick={() => setShowGrid(!showGrid)} 
            title="网格开关 (G)"
            className="rounded-full"
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <Button variant="ghost" size="icon" onClick={() => { save(); toast.success('已保存') }} title="快速保存" className="rounded-full">
            <Save className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => downloadPNG(exportPNG)} title="导出图片" className="rounded-full">
            <ImageDown className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Status Bar */}
        <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-wider text-slate-500">
           <span className="flex items-center gap-1">
             <MousePointer2 className="h-3 w-3" />
             {tool === 'selectRect' ? '选框工具' : '画笔工具'}
           </span>
           <span className="flex items-center gap-1">
             <ZoomIn className="h-3 w-3" />
             滚轮缩放
           </span>
           <span className="hidden sm:inline-block">Alt 取色</span>
        </div>
      </div>
    </div>
  )
}
