import { useEffect } from 'react'
import PixelCanvas from './components/PixelCanvas'
import Palette from './components/Palette'
import HUD from './components/HUD'
import Controls from './components/Controls'
import MiniMap from './components/MiniMap'
import ActionDock from './components/ActionDock'
import usePixelStore from './store/usePixelStore'

import { Toaster } from 'sonner'

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
  const setTool = usePixelStore(s => s.setTool)

  useEffect(() => {
    load()
    applyHash(window.location.hash)
    const onHash = () => applyHash(window.location.hash)

    const KEY_BINDINGS: {
      match: (e: KeyboardEvent) => boolean
      preventDefault?: boolean
      action: (e: KeyboardEvent) => void
    }[] = [
      {
        match: (e) => {
          const key = e.key
          const ctrl = e.ctrlKey || e.metaKey
          return ctrl && !e.shiftKey && (key === 'z' || key === 'Z')
        },
        preventDefault: true,
        action: () => {
          undo()
        },
      },
      {
        match: (e) => {
          const key = e.key
          return key === '+' || key === '='
        },
        preventDefault: true,
        action: () => {
          const ns = viewport.scale * 1.1
          setScale(ns)
        },
      },
      {
        match: (e) => e.key === '-',
        preventDefault: true,
        action: () => {
          const ns = viewport.scale / 1.1
          setScale(ns)
        },
      },
      {
        match: (e) => e.key === 'g' || e.key === 'G',
        preventDefault: true,
        action: () => {
          setShowGrid(!showGrid)
        },
      },
      {
        match: (e) => e.key === 'b' || e.key === 'B',
        preventDefault: true,
        action: () => {
          setTool('paint')
        },
      },
      {
        match: (e) => e.key === 'm' || e.key === 'M',
        preventDefault: true,
        action: () => {
          setTool('selectRect')
        },
      },
      {
        match: (e) => /^[0-9]$/.test(e.key),
        action: (e) => {
          const key = e.key
          const idx = key === '0' ? 9 : (parseInt(key, 10) - 1)
          setSelected(idx)
        },
      },
      {
        match: (e) => e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A',
        preventDefault: true,
        action: () => {
          const step = 50
          panBy(step, 0)
        },
      },
      {
        match: (e) => e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D',
        preventDefault: true,
        action: () => {
          const step = 50
          panBy(-step, 0)
        },
      },
      {
        match: (e) => e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W',
        preventDefault: true,
        action: () => {
          const step = 50
          panBy(0, step)
        },
      },
      {
        match: (e) => e.key === 'ArrowDown' || e.key === 's' || e.key === 'S',
        preventDefault: true,
        action: () => {
          const step = 50
          panBy(0, -step)
        },
      },
      {
        match: (e) => e.key === 'f' || e.key === 'F',
        preventDefault: true,
        action: () => {
          fillSelection()
        },
      },
      {
        match: (e) => e.key === 'Escape',
        preventDefault: true,
        action: () => {
          clearSelection()
        },
      },
    ]

    const onKey = (e: KeyboardEvent) => {
      for (const binding of KEY_BINDINGS) {
        if (binding.match(e)) {
          if (binding.preventDefault) {
            e.preventDefault()
          }
          binding.action(e)
          return
        }
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
    }
  }, [undo, load, panBy, setScale, setSelected, setShowGrid, showGrid, viewport.scale, applyHash, fillSelection, clearSelection, setTool])

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden text-slate-100 selection:bg-sky-500/30">
      {/* Header */}
      <header className="z-20 flex shrink-0 items-center justify-between border-b border-white/5 bg-slate-950/20 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/20">
            <span className="text-lg font-bold text-white">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">Pixel Studio</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">多人实时像素协作</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden items-center gap-6 rounded-full bg-slate-900/50 px-5 py-2 text-xs font-medium text-slate-400 border border-white/5 sm:flex">
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white">B</kbd> 画笔</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white">M</kbd> 选框</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white">Alt</kbd> 取色</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white">Space</kbd> 拖拽</span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-0 flex-1 gap-4 p-4">
        {/* Canvas Area */}
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 shadow-2xl shadow-black/40 backdrop-blur-sm ring-1 ring-black/20">
          <PixelCanvas />
          <HUD />
        </section>

        {/* Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          <MiniMap />
          <Palette />
          <Controls />
        </aside>
      </main>

      <ActionDock />
      <Toaster position="bottom-center" theme="dark" className="mb-20" />
    </div>
  )
}

export default App
