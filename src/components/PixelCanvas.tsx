import { useEffect, useRef } from 'react'
import usePixelStore from '../store/usePixelStore'
import { clamp } from '../utils/math'
import { hexToRgb } from '../utils/color'
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null)
  
  const { hoverRef, isSpacePressedRef } = useCanvasInteraction(canvasRef)

  const width = usePixelStore(s => s.width)
  const height = usePixelStore(s => s.height)
  const version = usePixelStore(s => s.version)
  const palette = usePixelStore(s => s.palette)
  const paletteRGB = usePixelStore(s => s.paletteRGB)
  const consumeDirty = usePixelStore(s => s.consumeDirty)
  const setCanvasSize = usePixelStore(s => s.setCanvasSize)

  // Offscreen update (partial redraw) - Reacts to data changes
  useEffect(() => {
    if (!offRef.current) offRef.current = document.createElement('canvas')
    const off = offRef.current
    if (off.width !== width) off.width = width
    if (off.height !== height) off.height = height
    const octx = off.getContext('2d')!

    const { full, list } = consumeDirty()
    const pixels = usePixelStore.getState().pixels

    if (full || version === 0) {
      const img = octx.createImageData(width, height)
      const data = img.data
      const pal = paletteRGB
      for (let i = 0, p = 0; i < pixels.length; i++, p += 4) {
        const base = pixels[i] * 3
        data[p] = pal[base] ?? 0
        data[p + 1] = pal[base + 1] ?? 0
        data[p + 2] = pal[base + 2] ?? 0
        data[p + 3] = 255
      }
      octx.putImageData(img, 0, 0)
    } else if (list.length) {
      // partial redraw
      for (let k = 0; k < list.length; k++) {
        const idx = list[k]
        const x = idx % width
        const y = (idx / width) | 0
        octx.fillStyle = palette[pixels[idx]] || '#000'
        octx.fillRect(x, y, 1, 1)
      }
    }
  }, [width, height, version, palette, paletteRGB, consumeDirty])

  // Main Render Loop
  useEffect(() => {
    let raf = 0
    const render = () => {
      const canvas = canvasRef.current
      const off = offRef.current
      if (!canvas || !off) {
        raf = requestAnimationFrame(render)
        return
      }

      // Read latest state directly to avoid re-binding RAF
      const state = usePixelStore.getState()
      const { viewport, showGrid, gridColor, gridAlpha, gridMinScale, selection } = state
      
      const ctx = canvas.getContext('2d')!
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const rect = canvas.getBoundingClientRect()
      const cw = Math.max(1, Math.floor(rect.width * dpr))
      const ch = Math.max(1, Math.floor(rect.height * dpr))
      
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.imageSmoothingEnabled = false

      // compute visible world rect and crop draw
      const scale = viewport.scale
      const ox = viewport.offsetX
      const oy = viewport.offsetY
      const visX = clamp(Math.floor((-ox) / scale), 0, width)
      const visY = clamp(Math.floor((-oy) / scale), 0, height)
      const visW = clamp(Math.ceil((rect.width - ox) / scale) - visX, 0, width - visX)
      const visH = clamp(Math.ceil((rect.height - oy) / scale) - visY, 0, height - visY)

      if (visW > 0 && visH > 0) {
        const dx = Math.round(ox + visX * scale)
        const dy = Math.round(oy + visY * scale)
        const dw = Math.round(visW * scale)
        const dh = Math.round(visH * scale)
        ctx.drawImage(off, visX, visY, visW, visH, dx, dy, dw, dh)
      }

      // grid overlay
      if (showGrid && scale >= gridMinScale) {
        ctx.save()
        const [gr, gg, gb] = hexToRgb(gridColor)
        ctx.strokeStyle = `rgba(${gr},${gg},${gb},${gridAlpha})`
        ctx.lineWidth = 1
        // vertical
        const startX = visX
        const endX = visX + visW
        for (let x = startX; x <= endX; x++) {
          const px = Math.round(ox + x * scale) + 0.5
          ctx.beginPath()
          ctx.moveTo(px, Math.round(oy + visY * scale))
          ctx.lineTo(px, Math.round(oy + (visY + visH) * scale))
          ctx.stroke()
        }
        // horizontal
        const startY = visY
        const endY = visY + visH
        for (let y = startY; y <= endY; y++) {
          const py = Math.round(oy + y * scale) + 0.5
          ctx.beginPath()
          ctx.moveTo(Math.round(ox + visX * scale), py)
          ctx.lineTo(Math.round(ox + (visX + visW) * scale), py)
          ctx.stroke()
        }
        ctx.restore()
      }

      // hover highlight
      const hover = hoverRef.current
      if (hover) {
        ctx.save()
        ctx.translate(ox, oy)
        ctx.scale(scale, scale)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1/scale
        ctx.strokeRect(hover.x + 0.05, hover.y + 0.05, 0.9, 0.9)
        ctx.restore()
      }

      if (selection) {
        const x0 = Math.min(selection.x0, selection.x1)
        const y0 = Math.min(selection.y0, selection.y1)
        const x1 = Math.max(selection.x0, selection.x1)
        const y1 = Math.max(selection.y0, selection.y1)
        ctx.save()
        ctx.translate(ox, oy)
        ctx.scale(scale, scale)
        ctx.strokeStyle = 'rgba(0,180,255,0.9)'
        ctx.lineWidth = 1/scale
        ctx.strokeRect(x0 + 0.02, y0 + 0.02, (x1 - x0 + 1) - 0.04, (y1 - y0 + 1) - 0.04)
        ctx.restore()
      }

      raf = requestAnimationFrame(render)
    }
    
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [width, height]) // width/height needed for bounds checking in render

  // Resize Observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect()
      setCanvasSize(rect.width, rect.height)
    }

    const ro = new ResizeObserver(updateCanvasSize)
    updateCanvasSize()
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [setCanvasSize])

  return (
    <div className="h-full w-full">
      <canvas 
        ref={canvasRef} 
        className={`h-full w-full touch-none ${isSpacePressedRef.current ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`} 
      />
    </div>
  )
}
