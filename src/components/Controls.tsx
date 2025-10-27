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
      <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onFileChange} />
    </div>
  )
}
