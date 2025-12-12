import { useRef } from 'react'
import usePixelStore from '../store/usePixelStore'
import { Button } from './ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Input } from './ui/Input'
import { Slider } from './ui/Slider'
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
  Link2,
  Globe2,
  Wifi,
  WifiOff,
  AlertCircle,
  Settings2,
  Share2,
  Monitor
} from 'lucide-react'

export default function Controls() {
  // State selectors
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
  const wsStatus = usePixelStore(s => s.wsStatus)
  const wsError = usePixelStore(s => s.wsError)
  const authoritativeMode = usePixelStore(s => s.authoritativeMode)
  const setAuthoritativeMode = usePixelStore(s => s.setAuthoritativeMode)

  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleExportPNG = () => {
    const url = exportPNG()
    const a = document.createElement('a')
    a.href = url
    a.download = `pixel-art-${Date.now()}.png`
    a.click()
    toast.success('Snapshot saved')
  }

  const handleExportJSON = () => {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pixel-project-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Project exported')
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
        toast.error('Invalid file format')
      } else {
        toast.success('Project loaded')
      }
    } catch (error) {
      toast.error('Failed to read file')
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Tools Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" /> Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={tool === 'paint' ? 'primary' : 'secondary'}
              onClick={() => setTool('paint')}
              className="justify-start gap-2"
            >
              <Pencil className="h-4 w-4" /> Paint
            </Button>
            <Button
              variant={tool === 'selectRect' ? 'primary' : 'secondary'}
              onClick={() => setTool('selectRect')}
              className="justify-start gap-2"
            >
              <BoxSelect className="h-4 w-4" /> Select
            </Button>
          </div>

          {tool === 'selectRect' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                disabled={!selection}
                onClick={() => {
                  if(selection) {
                    fillSelection()
                    toast.success('Filled selection')
                  }
                }}
                className="gap-2"
              >
                <PaintBucket className="h-3.5 w-3.5" /> Fill
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selection}
                onClick={() => clearSelection()}
                className="gap-2"
              >
                <Ban className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canvas Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" /> Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { undo(); toast.info('Undid last action') }} className="gap-2">
              <Undo2 className="h-4 w-4" /> Undo
            </Button>
            <Button variant="danger" onClick={() => { clear(); toast.warning('Canvas cleared') }} className="gap-2">
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <Button variant="outline" onClick={() => { save(); toast.success('Saved to local storage') }} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
            <Button variant="outline" onClick={() => { load(); toast.success('Loaded from storage') }} className="gap-2">
              <FolderOpen className="h-4 w-4" /> Load
            </Button>
          </div>
          
          <div className="pt-2 border-t border-border grid grid-cols-1 gap-2">
             <Button variant="outline" size="sm" onClick={handleExportPNG} className="justify-start gap-2">
               <ImageDown className="h-4 w-4" /> Export PNG
             </Button>
             <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2">
                <FileJson className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportJSON} className="gap-2">
                <Upload className="h-4 w-4" /> Import JSON
              </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" /> Display
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className={showGrid ? "text-primary bg-primary/10" : "text-muted-foreground"}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        {showGrid && (
          <CardContent className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground">Grid Color</label>
               <div className="flex items-center gap-3">
                 <div 
                   className="h-8 w-8 rounded-md border border-border shadow-sm shrink-0 relative overflow-hidden" 
                   style={{ backgroundColor: gridColor }}
                 >
                   <input
                    type="color"
                    value={gridColor}
                    onChange={e => setGridColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                 </div>
                 <Input 
                    value={gridColor} 
                    onChange={e => setGridColor(e.target.value)}
                    className="font-mono text-xs" 
                 />
               </div>
             </div>
             
             <Slider
               label="Opacity"
               valueLabel={`${Math.round(gridAlpha * 100)}%`}
               min={0}
               max={1}
               step={0.01}
               value={gridAlpha}
               onChange={e => setGridAlpha(parseFloat(e.target.value))}
             />

             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground">Min Zoom for Grid</label>
               <div className="flex items-center gap-2">
                 <Input
                   type="number"
                   min={1}
                   max={64}
                   value={gridMinScale}
                   onChange={e => setGridMinScale(parseInt(e.target.value || '8'))}
                   className="h-8 text-xs"
                 />
                 <span className="text-xs text-muted-foreground">px</span>
               </div>
             </div>
          </CardContent>
        )}
      </Card>

      {/* Network & Share */}
      <Card>
        <CardHeader className="pb-3">
           <CardTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> Network
           </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 border border-border">
             <div className={cn("h-2.5 w-2.5 rounded-full", {
                'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse': wsStatus === 'connected',
                'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
                'bg-red-500': wsStatus === 'error',
                'bg-slate-500': wsStatus === 'disconnected'
              })} />
             <span className="text-xs font-medium text-muted-foreground uppercase">
                {wsStatus === 'connected' ? 'Online' : wsStatus}
             </span>
           </div>

          <div className="space-y-2">
            <Input
              placeholder="ws://localhost:8080"
              value={wsUrl}
              onChange={e => setWsUrl(e.target.value)}
              className="font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                 variant={wsStatus === 'connecting' ? 'secondary' : 'primary'}
                 disabled={!wsUrl.trim() || wsStatus === 'connecting' || wsStatus === 'connected'}
                 onClick={() => connectWS(wsUrl)}
                 className="gap-2"
              >
                 <Wifi className="h-4 w-4" /> Connect
              </Button>
               <Button
                 variant="secondary"
                 disabled={wsStatus === 'disconnected'}
                 onClick={() => {
                   disconnectWS()
                   toast.info('Disconnected')
                 }}
                 className="gap-2"
              >
                 <WifiOff className="h-4 w-4" /> Disconnect
              </Button>
            </div>
          </div>
          
          {/* Advanced Network Settings */}
          <div className="space-y-3 pt-2 border-t border-border">
             <div className="flex items-center justify-between">
               <label className="text-xs text-muted-foreground">Authoritative Mode</label>
               <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-input accent-primary"
                  checked={authoritativeMode}
                  onChange={e => setAuthoritativeMode(e.target.checked)}
                />
             </div>
          </div>

          {wsError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive border border-destructive/20">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="line-clamp-2 font-medium">{wsError}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
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
                  toast.success('Link copied')
                } catch {
                  toast.error('Failed to copy')
                }
              }}
            >
              <Link2 className="h-3.5 w-3.5" /> Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                applyHash(location.hash)
                toast.success('View restored')
              }}
            >
              <Globe2 className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onFileChange} />
    </div>
  )
}
