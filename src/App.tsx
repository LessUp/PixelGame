import { useEffect } from 'react'
import PixelCanvas from './components/PixelCanvas'
import Palette from './components/Palette'
import HUD from './components/HUD'
import Controls from './components/Controls'
import MiniMap from './components/MiniMap'
import ActionDock from './components/ActionDock'
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
  const setTool = usePixelStore(s => s.setTool)

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
      if (key === 'b' || key === 'B') {
        e.preventDefault()
        setTool('paint')
        return
      }
      if (key === 'm' || key === 'M') {
        e.preventDefault()
        setTool('selectRect')
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
  }, [undo, load, panBy, setScale, setSelected, setShowGrid, showGrid, viewport.scale, applyHash, fillSelection, clearSelection, setTool])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col px-6 py-8 lg:px-10 lg:py-12">
        <header className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.4em] text-sky-200/80 shadow-sm shadow-slate-950/40">PixelGame</span>
            <div>
              <h1 className="text-3xl font-semibold text-white drop-shadow md:text-4xl">像素创作工作室</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300/90">
                在这里探索无穷的像素灵感：通过快捷键与工具快速切换创作模式，利用迷你地图、网格与调色板，打造精致的像素世界。
              </p>
            </div>
          </div>
          <div className="flex min-w-[15rem] flex-col gap-2 rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-xs text-slate-200/80 shadow-xl shadow-slate-950/40 backdrop-blur">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-sky-200/80">快捷提示</h2>
            <ul className="space-y-1 leading-relaxed">
              <li>左键放置像素，右键拖动画布</li>
              <li>滚轮缩放（鼠标位置为缩放锚点）</li>
              <li>按住 Alt 吸管取色，Ctrl+Z 撤销</li>
              <li>B 切换画笔，M 切换选框，F 填充选区</li>
            </ul>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 pb-8 lg:flex-row">
          <section className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl shadow-slate-950/50 backdrop-blur">
            <PixelCanvas />
            <HUD />
          </section>

          <aside className="w-full shrink-0 space-y-5 lg:max-w-sm">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/90">创作工具</h2>
                <span className="text-xs text-slate-300/80">操作 &amp; 设置</span>
              </div>
              <div className="mt-4">
                <Controls />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/50 backdrop-blur">
              <MiniMap />
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/50 backdrop-blur">
              <h2 className="text-sm font-semibold text-white/90">调色板</h2>
              <p className="mt-1 text-xs text-slate-300/80">快速挑选或切换常用像素颜色。</p>
              <div className="mt-4">
                <Palette />
              </div>
            </div>
          </aside>
        </div>
        <ActionDock />
      </div>
    </div>
  )
}

export default App
