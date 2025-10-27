import { useEffect, useRef, useState } from 'react'
import usePixelStore from '../store/usePixelStore'
 
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offRef = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState<{x:number,y:number}|null>(null)

  const width = usePixelStore(s => s.width)
  const height = usePixelStore(s => s.height)
  const version = usePixelStore(s => s.version)
  const palette = usePixelStore(s => s.palette)
  const viewport = usePixelStore(s => s.viewport)
  const setCanvasSize = usePixelStore(s => s.setCanvasSize)
  const consumeDirty = usePixelStore(s => s.consumeDirty)
  const showGrid = usePixelStore(s => s.showGrid)

  // Offscreen update (partial redraw)
  useEffect(() => {
    if (!offRef.current) offRef.current = document.createElement('canvas')
    const off = offRef.current
    if (off.width !== width) off.width = width
    if (off.height !== height) off.height = height
    const octx = off.getContext('2d')!

    const { full, list } = consumeDirty()
    const pixels = usePixelStore.getState().pixels

    if (full || version === 0) {
      // full redraw (palette change or initial)
      octx.clearRect(0, 0, width, height)
      for (let y = 0, i = 0; y < height; y++) {
        for (let x = 0; x < width; x++, i++) {
          octx.fillStyle = palette[pixels[i]] || '#000'
          octx.fillRect(x, y, 1, 1)
        }
      }
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
  }, [width, height, version, palette, consumeDirty])

  useEffect(() => {
    let raf = 0
    const render = () => {
      const canvas = canvasRef.current
      const off = offRef.current
      if (!canvas || !off) {
        raf = requestAnimationFrame(render)
        return
      }
      const ctx = canvas.getContext('2d')!
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const rect = canvas.getBoundingClientRect()
      const cw = Math.max(1, Math.floor(rect.width * dpr))
      const ch = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }

      // report logical canvas size for viewport calculations
      setCanvasSize(rect.width, rect.height)

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
      if (showGrid && scale >= 8) {
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
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
      if (hover) {
        ctx.save()
        ctx.translate(ox, oy)
        ctx.scale(scale, scale)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1/scale
        ctx.strokeRect(hover.x + 0.05, hover.y + 0.05, 0.9, 0.9)
        ctx.restore()
      }

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [viewport, hover, setCanvasSize])

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return

    // Observe size changes
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      setCanvasSize(rect.width, rect.height)
    })
    ro.observe(canvas)

    let isPanning = false
    let lastX = 0
    let lastY = 0
    let touchMoved = false
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchStartDist = 0
    let pinchStartScale = 1
    let pinchAnchor = { x: 0, y: 0 }

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (e.pointerType === 'touch') {
        pointers.set(e.pointerId, { x, y })
        if (pointers.size === 2) {
          // start pinch
          const arr = Array.from(pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          pinchStartDist = Math.hypot(dx, dy)
          pinchStartScale = usePixelStore.getState().viewport.scale
          pinchAnchor = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 }
        } else if (pointers.size === 1) {
          isPanning = true
          lastX = x
          lastY = y
          touchMoved = false
        }
        canvas.setPointerCapture(e.pointerId)
        return
      }

      if (e.button === 0) {
        const vp = usePixelStore.getState().viewport
        const gx = Math.floor((x - vp.offsetX) / vp.scale)
        const gy = Math.floor((y - vp.offsetY) / vp.scale)
        if (e.altKey) {
          usePixelStore.getState().pickColor(gx, gy)
        } else {
          usePixelStore.getState().placePixel(gx, gy)
        }
      } else {
        isPanning = true
        lastX = x
        lastY = y
        canvas.setPointerCapture(e.pointerId)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const vp = usePixelStore.getState().viewport
      const gx = Math.floor((x - vp.offsetX) / vp.scale)
      const gy = Math.floor((y - vp.offsetY) / vp.scale)
      if (gx >= 0 && gy >= 0 && gx < usePixelStore.getState().width && gy < usePixelStore.getState().height) {
        setHover({ x: gx, y: gy })
      } else {
        setHover(null)
      }
      
      if (e.pointerType === 'touch') {
        pointers.set(e.pointerId, { x, y })
        if (pointers.size === 2) {
          const arr = Array.from(pointers.values())
          const dx2 = arr[0].x - arr[1].x
          const dy2 = arr[0].y - arr[1].y
          const dist = Math.hypot(dx2, dy2)
          const factor = dist / Math.max(1, pinchStartDist)
          const ns = pinchStartScale * factor
          usePixelStore.getState().setScale(ns, pinchAnchor)
          return
        }
        if (isPanning) {
          usePixelStore.getState().panBy(x - lastX, y - lastY)
          lastX = x
          lastY = y
          touchMoved = true
        }
        return
      }

      if (isPanning) {
        usePixelStore.getState().panBy(x - lastX, y - lastY)
        lastX = x
        lastY = y
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        // finalize touch: if it was a tap (no movement and not pinch), place a pixel
        pointers.delete(e.pointerId)
        if (pointers.size < 2) {
          pinchStartDist = 0
        }
        if (!touchMoved && !pointers.size) {
          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const vp = usePixelStore.getState().viewport
          const gx = Math.floor((x - vp.offsetX) / vp.scale)
          const gy = Math.floor((y - vp.offsetY) / vp.scale)
          usePixelStore.getState().placePixel(gx, gy)
        }
        isPanning = false
        canvas.releasePointerCapture(e.pointerId)
        return
      }

      if (isPanning) {
        isPanning = false
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const factor = e.deltaY > 0 ? 1/1.1 : 1.1
      const ns = usePixelStore.getState().viewport.scale * factor
      usePixelStore.getState().setScale(ns, anchor)
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [setCanvasSize])

  return (
    <div className="w-full h-full bg-neutral-900">
      <canvas ref={canvasRef} className="w-full h-full touch-none" />
    </div>
  )
}
