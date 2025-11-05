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
  const wsUrl = usePixelStore(s => s.wsUrl)
  const setWsUrl = usePixelStore(s => s.setWsUrl)
  const connectWS = usePixelStore(s => s.connectWS)
  const disconnectWS = usePixelStore(s => s.disconnectWS)
  const wsEnabled = usePixelStore(s => s.wsEnabled)
  const wsStatus = usePixelStore(s => s.wsStatus)
  const wsError = usePixelStore(s => s.wsError)
  const wsLastHeartbeat = usePixelStore(s => s.wsLastHeartbeat)

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
        <h3 className="text-sm font-medium text-white/80">工具</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`px-3 py-2 rounded border transition ${tool === 'paint' ? 'border-sky-400 bg-sky-600/20 text-white' : 'border-white/10 bg-neutral-800 hover:bg-neutral-700 text-white/80'}`}
            onClick={() => setTool('paint')}
            aria-pressed={tool === 'paint'}
          >
            画笔工具 (B)
          </button>
          <button
            className={`px-3 py-2 rounded border transition ${tool === 'selectRect' ? 'border-sky-400 bg-sky-600/20 text-white' : 'border-white/10 bg-neutral-800 hover:bg-neutral-700 text-white/80'}`}
            onClick={() => setTool('selectRect')}
            aria-pressed={tool === 'selectRect'}
          >
            选框工具 (M)
          </button>
        </div>
        <p className="text-xs text-white/60">
          当前工具：{tool === 'paint' ? '画笔（左键/轻触绘制，Alt 吸管）' : '矩形选框（拖拽框选，F 填充，Esc 取消）'}
        </p>
        {tool === 'selectRect' && (
          <div className="space-y-2 rounded border border-sky-500/30 bg-sky-500/5 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-700 disabled:text-white/40"
                onClick={() => fillSelection()}
                disabled={!selection}
              >
                填充选区 (F)
              </button>
              <button
                className="px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800/80 disabled:text-white/30"
                onClick={() => clearSelection()}
                disabled={!selection}
              >
                取消选择 (Esc)
              </button>
            </div>
            {selection ? (
              <p className="text-xs text-white/60">
                选区：({Math.min(selection.x0, selection.x1)}, {Math.min(selection.y0, selection.y1)}) → ({Math.max(selection.x0, selection.x1)}, {Math.max(selection.y0, selection.y1)})
              </p>
            ) : (
              <p className="text-xs text-white/40">点击或拖拽画布以创建选区</p>
            )}
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
          <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={async () => {
            const hash = exportHash()
            const url = `${location.origin}${location.pathname}${hash}`
            location.hash = hash
            try {
              await navigator.clipboard.writeText(url)
            } catch (err) {
              console.warn('[controls] 复制链接失败', err)
            }
          }}>复制分享链接</button>
        <button className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10" onClick={() => {
          applyHash(location.hash)
        }}>应用当前链接</button>
      </div>
      <div className="space-y-2 pt-4 border-t border-white/10">
        <h3 className="text-sm font-medium text-white/80">联机</h3>
        <div className="space-y-2">
          <label className="block text-xs text-white/60">服务器地址</label>
          <input
            className="w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="wss://example.com/ws"
            value={wsUrl}
            onChange={e => setWsUrl(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-700 disabled:text-white/40"
              onClick={() => connectWS(wsUrl)}
              disabled={!wsUrl.trim() || wsStatus === 'connecting'}
            >
              {wsStatus === 'connecting' ? '连接中…' : '连接服务器'}
            </button>
            <button
              className="px-3 py-1.5 rounded bg-neutral-700 hover:bg-neutral-600"
              onClick={disconnectWS}
            >
              断开连接
            </button>
            <span className={`text-xs ${wsEnabled ? 'text-emerald-400' : wsStatus === 'error' ? 'text-red-400' : 'text-white/60'}`}>
              状态：{wsEnabled ? '已连接' : wsStatus === 'connecting' ? '连接中' : wsStatus === 'error' ? '连接异常' : '未连接'}
            </span>
          </div>
          <div className="text-xs text-white/60">
            <div>wsEnabled：{wsEnabled ? 'true' : 'false'}</div>
            {wsLastHeartbeat && (
              <div>最近心跳：{new Date(wsLastHeartbeat).toLocaleTimeString()}</div>
            )}
          </div>
          {wsError && (
            <div className="text-xs text-red-400">{wsError}</div>
          )}
        </div>
      </div>
      <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onFileChange} />
    </div>
  )
}
