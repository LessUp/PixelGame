import usePixelStore from '../store/usePixelStore'

function downloadPNG(exportPNG: () => string) {
  const url = exportPNG()
  const a = document.createElement('a')
  a.href = url
  a.download = 'pixel-board.png'
  a.click()
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

  const baseBtn =
    'flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:text-white'

  const activeBtn = `${baseBtn} bg-sky-500/20 text-white shadow-lg shadow-sky-900/40`
  const subtleBtn = `${baseBtn} bg-slate-800/60 shadow-inner shadow-black/20`

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-4xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <button className={subtleBtn} onClick={undo} title="撤销 (Ctrl+Z)">
            ↺ 撤销
          </button>
          <button className={subtleBtn} onClick={save} title="保存至本地缓存">
            💾 保存
          </button>
          <button className={subtleBtn} onClick={() => downloadPNG(exportPNG)} title="导出 PNG">
            ⬇️ 导出
          </button>
          <button
            className={showGrid ? activeBtn : subtleBtn}
            onClick={() => setShowGrid(!showGrid)}
            title="显示/隐藏网格 (G)"
            aria-pressed={showGrid}
          >
            # 网格 {showGrid ? '开' : '关'}
          </button>
          <button
            className={tool === 'paint' ? activeBtn : subtleBtn}
            onClick={() => setTool('paint')}
            title="画笔模式 (B)"
            aria-pressed={tool === 'paint'}
          >
            ✏️ 画笔
          </button>
          <button
            className={tool === 'selectRect' ? activeBtn : subtleBtn}
            onClick={() => setTool('selectRect')}
            title="选框模式 (M)"
            aria-pressed={tool === 'selectRect'}
          >
            ▧ 选框
          </button>
          <button
            className={selection ? subtleBtn : `${subtleBtn} cursor-not-allowed opacity-50`}
            disabled={!selection}
            onClick={() => selection && fillSelection()}
            title="填充当前选区 (F)"
          >
            🩸 填充
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-300/80">
          <span>当前工具：{tool === 'selectRect' ? '选框 (M)' : '画笔 (B)'}</span>
          <span className="flex gap-4">
            <span>滚轮：缩放画布</span>
            <span>Alt：吸管</span>
          </span>
        </div>
      </div>
    </div>
  )
}
