import { useRef } from 'react'
import usePixelStore from '../store/usePixelStore'
import { Button } from './ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Input } from './ui/Input'
import { cn } from '../utils/cn'
import { toast } from 'sonner'
import { 
  Pencil, 
  BoxSelect, 
  PaintBucket, 
  Ban, 
  Undo2, 
  Trash2, 
  Save, 
  FolderOpen, 
  ImageDown, 
  FileJson, 
  Upload,
  Grid3X3,
  Settings2,
  Link2,
  Globe2,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

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
    toast.success('图片导出成功')
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
    toast.success('项目数据导出成功')
  }

  const handleImportJSON = () => {
    fileRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const ok = importJSON(text)
      if (!ok) {
        toast.error('导入失败：文件格式不匹配或数据损坏')
      } else {
        toast.success('项目加载成功')
      }
    } catch (error) {
      toast.error('读取文件失败')
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>工具模式</CardTitle>
          <span className="text-[0.65rem] text-slate-500">B / M</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={tool === 'paint' ? 'primary' : 'secondary'}
              onClick={() => setTool('paint')}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" /> 画笔
            </Button>
            <Button
              variant={tool === 'selectRect' ? 'primary' : 'secondary'}
              onClick={() => setTool('selectRect')}
              className="gap-2"
            >
              <BoxSelect className="h-4 w-4" /> 选框
            </Button>
          </div>
          {tool === 'selectRect' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <Button
                variant="secondary"
                size="sm"
                disabled={!selection}
                onClick={() => {
                  if(selection) {
                    fillSelection()
                    toast.success('选区已填充')
                  }
                }}
                className="gap-2"
              >
                <PaintBucket className="h-3.5 w-3.5" /> 填充
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selection}
                onClick={() => clearSelection()}
                className="gap-2"
              >
                <Ban className="h-3.5 w-3.5" /> 取消
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>画布管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { undo(); toast.info('已撤销') }} className="gap-2">
              <Undo2 className="h-4 w-4" /> 撤销
            </Button>
            <Button variant="danger" onClick={() => { clear(); toast.warning('画布已清空') }} className="gap-2">
              <Trash2 className="h-4 w-4" /> 清空
            </Button>
            <Button variant="secondary" onClick={() => { save(); toast.success('已保存至本地') }} className="gap-2">
              <Save className="h-4 w-4" /> 保存
            </Button>
            <Button variant="secondary" onClick={() => { load(); toast.success('已加载本地存档') }} className="gap-2">
              <FolderOpen className="h-4 w-4" /> 加载
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2">
             <Button variant="outline" size="sm" onClick={handleExportPNG} className="gap-2 w-full justify-start">
               <ImageDown className="h-4 w-4" /> 导出 PNG 图片
             </Button>
             <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2">
                <FileJson className="h-4 w-4" /> 导出 JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportJSON} className="gap-2">
                <Upload className="h-4 w-4" /> 导入 JSON
              </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>显示设置</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className={showGrid ? "text-sky-400" : "text-slate-500"}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </CardHeader>
        {showGrid && (
          <CardContent className="space-y-4 animate-in fade-in slide-in-from-top-2">
             <div className="space-y-1">
               <label className="text-xs text-slate-400">网格颜色</label>
               <div className="flex items-center gap-3">
                 <div 
                   className="h-6 w-6 rounded-full border border-white/20 shadow-inner" 
                   style={{ backgroundColor: gridColor }}
                 />
                 <input
                   type="color"
                   value={gridColor}
                   onChange={e => setGridColor(e.target.value)}
                   className="h-8 flex-1 cursor-pointer opacity-0 absolute w-full"
                 />
                 <Input 
                    value={gridColor} 
                    onChange={e => setGridColor(e.target.value)}
                    className="h-8 font-mono text-xs" 
                 />
               </div>
             </div>
             
             <div className="space-y-1">
               <div className="flex justify-between text-xs text-slate-400">
                 <label>不透明度</label>
                 <span>{Math.round(gridAlpha * 100)}%</span>
               </div>
               <input
                 className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                 type="range"
                 min={0}
                 max={1}
                 step={0.01}
                 value={gridAlpha}
                 onChange={e => setGridAlpha(parseFloat(e.target.value))}
               />
             </div>

             <div className="space-y-1">
               <label className="text-xs text-slate-400">最小显示比例</label>
               <div className="flex items-center gap-2">
                 <Input
                   type="number"
                   min={1}
                   max={64}
                   value={gridMinScale}
                   onChange={e => setGridMinScale(parseInt(e.target.value || '8'))}
                   className="h-8 text-xs"
                 />
                 <span className="text-xs text-slate-500">px</span>
               </div>
             </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
           <CardTitle>分享与历史</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
             <label className="text-xs text-slate-400 whitespace-nowrap">撤销步数</label>
             <Input
                type="number"
                min={1}
                max={1000}
                value={historyLimit}
                onChange={e => setHistoryLimit(parseInt(e.target.value || '200'))}
                className="h-8 w-24 text-right text-xs"
              />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                const hash = exportHash()
                const url = `${location.origin}${location.pathname}${hash}`
                location.hash = hash
                try {
                  await navigator.clipboard.writeText(url)
                  toast.success('链接已复制到剪贴板')
                } catch {
                  toast.error('复制失败，请手动复制 URL')
                }
              }}
            >
              <Link2 className="h-3.5 w-3.5" /> 复制链接
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                applyHash(location.hash)
                toast.success('已恢复视图')
              }}
            >
              <Globe2 className="h-3.5 w-3.5" /> 应用链接
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>联机协作</CardTitle>
          <div className={cn("h-2 w-2 rounded-full", {
            'bg-emerald-500 animate-pulse': wsEnabled,
            'bg-yellow-500': wsStatus === 'connecting',
            'bg-red-500': wsStatus === 'error',
            'bg-slate-700': !wsEnabled && wsStatus !== 'connecting' && wsStatus !== 'error'
          })} />
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="wss://..."
            value={wsUrl}
            onChange={e => setWsUrl(e.target.value)}
            className="text-xs font-mono"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
               variant={wsStatus === 'connecting' ? 'secondary' : 'primary'}
               disabled={!wsUrl.trim() || wsStatus === 'connecting'}
               onClick={() => connectWS(wsUrl)}
               className="gap-2"
            >
               <Wifi className="h-4 w-4" />
               {wsStatus === 'connecting' ? '连接中...' : '连接'}
            </Button>
             <Button
               variant="secondary"
               onClick={() => {
                 disconnectWS()
                 toast.info('已断开连接')
               }}
               className="gap-2"
            >
               <WifiOff className="h-4 w-4" /> 断开
            </Button>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 p-2 border border-white/5">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-white/20 accent-sky-500"
                checked={authoritativeMode}
                onChange={e => setAuthoritativeMode(e.target.checked)}
              />
              服务端权威模式
            </label>
          </div>

          {wsError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-400 border border-red-500/10">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{wsError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onFileChange} />
    </div>
  )
}
