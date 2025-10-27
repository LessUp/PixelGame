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
  const panBy = usePixelStore(s => s.panBy)
  const setScale = usePixelStore(s => s.setScale)
  const setSelected = usePixelStore(s => s.setSelected)
  const showGrid = usePixelStore(s => s.showGrid)
  const setShowGrid = usePixelStore(s => s.setShowGrid)
  const viewport = usePixelStore(s => s.viewport)
  const applyHash = usePixelStore(s => s.applyHash)
  const fillSelection = usePixelStore(s => s.fillSelection)
  const clearSelection = usePixelStore(s => s.clearSelection)

  useEffect(() => {
    load()
    applyHash(window.location.hash)
    const onHash = () => applyHash(window.location.hash)

    const onKey = (e: KeyboardEvent) => {
      const key = e.key
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && !e.shiftKey && (key === 'z' || key === 'Z')) {
        e.preventDefault()
        undo()
        return
      }
      if (key === '+' || key === '=' ) {
        e.preventDefault()
        const ns = viewport.scale * 1.1
        setScale(ns)
        return
      }
      if (key === '-') {
        e.preventDefault()
        const ns = viewport.scale / 1.1
        setScale(ns)
        return
      }
      if (key === 'g' || key === 'G') {
        e.preventDefault()
        setShowGrid(!showGrid)
        return
      }
      if (/^[0-9]$/.test(key)) {
        const idx = key === '0' ? 9 : (parseInt(key, 10) - 1)
        setSelected(idx)
        return
      }
      const step = 50
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') { e.preventDefault(); panBy(step, 0); return }
      if (key === 'ArrowRight' || key === 'd' || key === 'D') { e.preventDefault(); panBy(-step, 0); return }
      if (key === 'ArrowUp' || key === 'w' || key === 'W') { e.preventDefault(); panBy(0, step); return }
      if (key === 'ArrowDown' || key === 's' || key === 'S') { e.preventDefault(); panBy(0, -step); return }
      if (key === 'f' || key === 'F') { e.preventDefault(); fillSelection(); return }
      if (key === 'Escape') { e.preventDefault(); clearSelection(); return }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
    }
  }, [undo, load, panBy, setScale, setSelected, setShowGrid, showGrid, viewport.scale, applyHash, fillSelection, clearSelection])

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
