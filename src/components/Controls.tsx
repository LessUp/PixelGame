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
  const authoritativeMode = usePixelStore(s => s.authoritativeMode)
  const setAuthoritativeMode = usePixelStore(s => s.setAuthoritativeMode)

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

  const panelClass = 'rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-lg shadow-slate-950/50 backdrop-blur-sm space-y-4'
  const sectionTitle = 'text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sky-200/80'
  const controlButton = 'group relative overflow-hidden rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-sky-400/40 hover:bg-slate-700/70 hover:text-white shadow-sm shadow-slate-950/40'
  const accentButton = 'relative overflow-hidden rounded-xl border border-sky-400/60 bg-sky-500/20 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-sky-900/40 ring-1 ring-sky-300/30'
  const subtleInputLabel = 'text-xs text-slate-300/70'

  return (
    <div className="space-y-4">
      <section className={panelClass}>
        <div className="flex items-center justify-between">
          <h3 className={sectionTitle}>工具模式</h3>
          <span className="text-[0.7rem] text-slate-400/80">B / M</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={tool === 'paint' ? accentButton : controlButton}
            aria-pressed={tool === 'paint'}
            title="快捷键：B"
            onClick={() => setTool('paint')}
          >
            画笔 (B)
          </button>
          <button
            className={tool === 'selectRect' ? accentButton : controlButton}
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
              className={selection ? controlButton : 'rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2 text-sm text-slate-500 cursor-not-allowed'}
              disabled={!selection}
              onClick={() => selection && fillSelection()}
              title="填充选区（快捷键：F）"
            >
              填充选区 (F)
            </button>
            <button
              className={selection ? controlButton : 'rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2 text-sm text-slate-500 cursor-not-allowed'}
              disabled={!selection}
              onClick={() => clearSelection()}
              title="取消当前选择（快捷键：Esc）"
            >
              取消选择 (Esc)
            </button>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <h3 className={sectionTitle}>画布管理</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button className={controlButton} onClick={undo} title="撤销 (Ctrl+Z)">撤销</button>
          <button className={`${controlButton} border-red-500/60 text-red-200 hover:border-red-300/70 hover:bg-red-500/20`} onClick={clear} title="清空所有像素">清空</button>
          <button className={controlButton} onClick={save} title="保存至本地缓存">保存</button>
          <button className={controlButton} onClick={load} title="加载本地缓存">加载</button>
          <button className={controlButton} onClick={handleExportPNG} title="导出 PNG 图片">导出 PNG</button>
          <button className={controlButton} onClick={handleExportJSON} title="导出 JSON 数据">导出 JSON</button>
          <button className={controlButton} onClick={handleImportJSON} title="从 JSON 文件导入">导入 JSON</button>
        </div>
      </section>

      <section className={panelClass}>
        <div className="flex items-center gap-3">
          <input
            id="grid-toggle"
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="h-4 w-4 rounded border border-white/20 bg-slate-900/60 accent-sky-500"
          />
          <label htmlFor="grid-toggle" className="text-sm text-slate-200">显示网格</label>
        </div>
        {showGrid && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-inner shadow-slate-950/60">
            <div className="flex items-center gap-3">
              <label className={`${subtleInputLabel} w-20`}>网格颜色</label>
              <input
                type="color"
                value={gridColor}
                onChange={e => setGridColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border border-white/10 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className={`${subtleInputLabel} w-20`}>不透明度</label>
              <input
                className="flex-1 accent-sky-500"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={gridAlpha}
                onChange={e => setGridAlpha(parseFloat(e.target.value))}
              />
              <span className="w-12 text-right text-xs text-slate-200/80">{gridAlpha.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className={`${subtleInputLabel} w-20`}>最小缩放</label>
              <input
                className="w-24 rounded border border-white/10 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                type="number"
                min={1}
                max={64}
                value={gridMinScale}
                onChange={e => setGridMinScale(parseInt(e.target.value || '8'))}
              />
            </div>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <h3 className={sectionTitle}>历史与分享</h3>
        <div className="flex items-center gap-3">
          <label className={`${subtleInputLabel} w-28`}>撤销步数上限</label>
          <input
            className="w-24 rounded border border-white/10 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            type="number"
            min={1}
            max={1000}
            value={historyLimit}
            onChange={e => setHistoryLimit(parseInt(e.target.value || '200'))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={controlButton}
            title="复制当前视角与选色的分享链接"
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
          >
            复制分享链接
          </button>
          <button
            className={controlButton}
            title="从当前页面 URL 恢复视角、颜色与网格设置"
            onClick={() => {
              applyHash(location.hash)
            }}
          >
            应用当前链接
          </button>
        </div>
      </section>

      <section className={panelClass}>
        <div className="flex items-center justify-between">
          <h3 className={sectionTitle}>联机</h3>
          <span className="text-[0.7rem] text-slate-400/80">实验功能</span>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-300/70">服务器地址</label>
          <input
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
            placeholder="wss://example.com/ws"
            value={wsUrl}
            onChange={e => setWsUrl(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl bg-sky-600/90 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400"
              onClick={() => connectWS(wsUrl)}
              disabled={!wsUrl.trim() || wsStatus === 'connecting'}
            >
              {wsStatus === 'connecting' ? '连接中…' : '连接服务器'}
            </button>
            <button
              className="rounded-xl bg-slate-700/90 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-slate-600"
              onClick={disconnectWS}
            >
              断开连接
            </button>
            <label className="ml-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-white/20 accent-sky-500"
                checked={authoritativeMode}
                onChange={e => setAuthoritativeMode(e.target.checked)}
                title="启用服务端权威：连接异常时回滚未确认本地操作"
              />
              <span>服务端权威</span>
            </label>
            <span className={`text-xs font-medium ${wsEnabled ? 'text-emerald-300' : wsStatus === 'error' ? 'text-red-300' : 'text-slate-300/80'}`}>
              状态：{wsEnabled ? '已连接' : wsStatus === 'connecting' ? '连接中' : wsStatus === 'error' ? '连接异常' : '未连接'}
            </span>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 text-xs text-slate-300/70">
            <div>wsEnabled：{wsEnabled ? 'true' : 'false'}</div>
            {wsLastHeartbeat && (
              <div>最近心跳：{new Date(wsLastHeartbeat).toLocaleTimeString()}</div>
            )}
            {wsError && (
              <div className="mt-1 text-red-300">{wsError}</div>
            )}
            <div>权威模式：{authoritativeMode ? '启用' : '关闭'}</div>
          </div>
        </div>
      </section>

      <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onFileChange} />
    </div>
  )
}
