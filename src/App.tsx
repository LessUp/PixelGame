import { useEffect } from 'react'
import PixelCanvas from './components/PixelCanvas'
import Palette from './components/Palette'
import HUD from './components/HUD'
import Controls from './components/Controls'
import MiniMap from './components/MiniMap'
import usePixelStore from './store/usePixelStore'

function App() {
  const undo = usePixelStore(s => s.undo)
  const load = usePixelStore(s => s.load)

  useEffect(() => {
    load()
    const onKey = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')
      if (isUndo) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, load])

  return (
    <div className="w-screen h-screen overflow-hidden bg-neutral-950 text-white">
      <div className="w-full h-full grid grid-cols-[1fr_18rem] gap-0">
        <div className="relative">
          <PixelCanvas />
          <HUD />
        </div>
        <div className="h-full border-l border-white/10 p-3 bg-neutral-900/40 backdrop-blur overflow-auto">
          <h2 className="text-sm font-semibold mb-2 text-white/90">工具</h2>
          <Controls />
          <div className="h-4" />
          <MiniMap />
          <div className="h-4" />
          <h2 className="text-sm font-semibold mb-2 text-white/90">调色板</h2>
          <Palette />
          <div className="mt-4 text-xs text-white/60 space-y-1">
            <div>左键放置像素</div>
            <div>右键拖动画布</div>
            <div>滚轮缩放（指针为锚点）</div>
            <div>按住 Alt 吸管取色</div>
            <div>Ctrl+Z 撤销</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
