import { useRef } from 'react'
import usePixelStore from '../store/usePixelStore'

export default function Controls() {
  const undo = usePixelStore(s => s.undo)
  const clear = usePixelStore(s => s.clear)
  const save = usePixelStore(s => s.save)
  const load = usePixelStore(s => s.load)
  const exportPNG = usePixelStore(s => s.exportPNG)
  const exportJSON = usePixelStore(s => s.exportJSON)
  const importJSON = usePixelStore(s => s.importJSON)
  const showGrid = usePixelStore(s => s.showGrid)
  const setShowGrid = usePixelStore(s => s.setShowGrid)
  const gridColor = usePixelStore(s => s.gridColor)
  const gridAlpha = usePixelStore(s => s.gridAlpha)
  const gridMinScale = usePixelStore(s => s.gridMinScale)
  const setGridColor = usePixelStore(s => s.setGridColor)
  const setGridAlpha = usePixelStore(s => s.setGridAlpha)
  const setGridMinScale = usePixelStore(s => s.setGridMinScale)
  const historyLimit = usePixelStore(s => s.historyLimit)
  const setHistoryLimit = usePixelStore(s => s.setHistoryLimit)
  const exportHash = usePixelStore(s => s.exportHash)
  const applyHash = usePixelStore(s => s.applyHash)
  const tool = usePixelStore(s => s.tool)
  const setTool = usePixelStore(s => s.setTool)
  const selection = usePixelStore(s => s.selection)
  const fillSelection = usePixelStore(s => s.fillSelection)
  const clearSelection = usePixelStore(s => s.clearSelection)

  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleExportPNG = () => {
    const url = exportPNG()
    const a = document.createElement('a')
    a.href = url
    a.download = 'pixel-board.png'
    a.click()
  }

  const handleExportJSON = () => {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pixel-board.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = () => {
    fileRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const ok = importJSON(text)
    if (!ok) alert('导入失败：文件格式不匹配或数据损坏')
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`px-3 py-2 rounded border text-sm transition-colors ${
              tool === 'paint'
                ? 'bg-sky-700/70 border-sky-400/60 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 border-white/10 text-white/90'
            }`}
            aria-pressed={tool === 'paint'}
            title="快捷键：B"
            onClick={() => setTool('paint')}
          >
            画笔 (B)
          </button>
          <button
            className={`px-3 py-2 rounded border text-sm transition-colors ${
              tool === 'selectRect'
                ? 'bg-sky-700/70 border-sky-400/60 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 border-white/10 text-white/90'
            }`}
            aria-pressed={tool === 'selectRect'}
            title="快捷键：M"
            onClick={() => setTool('selectRect')}
          >
            选框 (M)
          </button>
        </div>
        {tool === 'selectRect' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-3 py-2 rounded border text-sm transition-colors ${
                selection
                  ? 'bg-neutral-800 hover:bg-neutral-700 border-white/10 text-white'
                  : 'bg-neutral-900 border-white/5 text-white/40 cursor-not-allowed'
              }`}
              disabled={!selection}
              onClick={() => selection && fillSelection()}
              title="填充选区（快捷键：F）"
            >
              填充选区 (F)
            </button>
            <button
              className={`px-3 py-2 rounded border text-sm transition-colors ${
                selection
                  ? 'bg-neutral-800 hover:bg-neutral-700 border-white/10 text-white'
                  : 'bg-neutral-900 border-white/5 text-white/40 cursor-not-allowed'
              }`}
              disabled={!selection}
              onClick={() => clearSelection()}
              title="取消当前选择（快捷键：Esc）"
            >
              取消选择 (Esc)
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={undo}>撤销 (Ctrl+Z)</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-red-500/40" onClick={clear}>清空</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={save}>保存</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={load}>加载</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={handleExportPNG}>导出 PNG</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={handleExportJSON}>导出 JSON</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={handleImportJSON}>导入 JSON</button>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input id="grid-toggle" type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
        <label htmlFor="grid-toggle" className="text-sm text-white/80">显示网格</label>
      </div>
      {showGrid && (
        <div className="space-y-2 pl-5">
          <div className="flex items-center gap-2">
            <label className="w-20 text-xs text-white/60">网格颜色</label>
            <input type="color" value={gridColor} onChange={e => setGridColor(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20 text-xs text-white/60">不透明度</label>
            <input className="flex-1" type="range" min={0} max={1} step={0.01} value={gridAlpha} onChange={e => setGridAlpha(parseFloat(e.target.value))} />
            <span className="text-xs text-white/60 w-10 text-right">{gridAlpha.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20 text-xs text-white/60">最小缩放</label>
            <input className="w-20" type="number" min={1} max={64} value={gridMinScale} onChange={e => setGridMinScale(parseInt(e.target.value || '8'))} />
          </div>
        </div>
      )}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <label className="w-28 text-xs text-white/60">撤销步数上限</label>
          <input className="w-24" type="number" min={1} max={1000} value={historyLimit} onChange={e => setHistoryLimit(parseInt(e.target.value || '200'))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10"
          onClick={async () => {
            const hash = exportHash()
            const url = `${location.origin}${location.pathname}${hash}`
            location.hash = hash
            try {
              await navigator.clipboard.writeText(url)
            } catch {
              /* clipboard write may be blocked */
            }
          }}
        >复制分享链接</button>
        <button
          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10"
          onClick={() => {
            applyHash(location.hash)
          }}
        >应用当前链接</button>
      </div>
      <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onFileChange} />
    </div>
  )
}
