import { useCallback, useEffect, useRef } from 'react'
import usePixelStore from '../store/usePixelStore'
import { hexToRgb } from '../utils/color'

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offRef = useRef<HTMLCanvasElement | null>(null)

  const width = usePixelStore(s => s.width)
  const height = usePixelStore(s => s.height)
  const version = usePixelStore(s => s.version)
  const palette = usePixelStore(s => s.palette)
  const viewport = usePixelStore(s => s.viewport)
  const canvasW = usePixelStore(s => s.canvasW)
  const canvasH = usePixelStore(s => s.canvasH)
  const centerOn = usePixelStore(s => s.centerOn)

  // rebuild offscreen when pixels or palette change
  useEffect(() => {
    if (!offRef.current) offRef.current = document.createElement('canvas')
    const off = offRef.current
    off.width = width
    off.height = height
    const octx = off.getContext('2d')!

    const img = octx.createImageData(width, height)
    const data = img.data
    const pal = palette.map(hexToRgb)
    const { pixels } = usePixelStore.getState()

    for (let i = 0, p = 0; i < pixels.length; i++, p += 4) {
      const c = pal[pixels[i]] || [0,0,0]
      data[p] = c[0]
      data[p+1] = c[1]
      data[p+2] = c[2]
      data[p+3] = 255
    }
    octx.putImageData(img, 0, 0)
  }, [width, height, version, palette])

  // draw minimap and the viewport rect
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const off = offRef.current
    if (!canvas || !off) return
    const ctx = canvas.getContext('2d')!

    const mmW = canvas.width
    const mmH = canvas.height

    ctx.clearRect(0, 0, mmW, mmH)
    ctx.imageSmoothingEnabled = false

    const scale = Math.min(mmW / width, mmH / height)
    const ox = (mmW - width * scale) / 2
    const oy = (mmH - height * scale) / 2

    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(scale, scale)
    ctx.drawImage(off, 0, 0)

    // viewport rect in world coords
    const x1 = Math.max(0, Math.floor((-viewport.offsetX) / viewport.scale))
    const y1 = Math.max(0, Math.floor((-viewport.offsetY) / viewport.scale))
    const x2 = Math.min(width, Math.ceil((canvasW - viewport.offsetX) / viewport.scale))
    const y2 = Math.min(height, Math.ceil((canvasH - viewport.offsetY) / viewport.scale))

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1/scale
    ctx.strokeRect(x1 + 0.5, y1 + 0.5, Math.max(0, x2 - x1 - 1), Math.max(0, y2 - y1 - 1))
    ctx.restore()
  }, [width, height, viewport, canvasW, canvasH])

  useEffect(() => { draw() }, [draw, version, palette])

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const mmW = canvas.width
      const mmH = canvas.height
      const scale = Math.min(mmW / width, mmH / height)
      const ox = (mmW - width * scale) / 2
      const oy = (mmH - height * scale) / 2

      const wx = Math.floor((x - ox) / scale)
      const wy = Math.floor((y - oy) / scale)

      if (wx >= 0 && wy >= 0 && wx < width && wy < height) {
        centerOn(wx, wy)
      }
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [width, height, centerOn])

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sky-200/80">迷你地图</h3>
        <p className="mt-1 text-xs text-slate-300/70">快速定位当前视角，一键聚焦到任意像素区域。</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2 shadow-inner shadow-slate-950/60">
        <canvas ref={canvasRef} className="h-auto w-full" width={256} height={256} />
      </div>
    </div>
  )
}
