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
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Header */}
      <header className="z-20 flex shrink-0 items-center justify-between border-b border-border bg-background/50 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <span className="text-xl font-bold text-primary-foreground">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Pixel Studio</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">Real-time Collaboration</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden items-center gap-4 rounded-full bg-secondary/50 px-5 py-2 text-xs font-medium text-muted-foreground border border-border sm:flex">
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">B</kbd> Paint</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">M</kbd> Select</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Alt</kbd> Pick</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Space</kbd> Pan</span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-0 flex-1 gap-4 p-4">
        {/* Canvas Area */}
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card/30 shadow-2xl backdrop-blur-sm">
          <PixelCanvas />
          <HUD />
        </section>

        {/* Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto pr-1">
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
