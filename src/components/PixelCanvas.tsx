import { useEffect, useRef, useState } from 'react'
import usePixelStore from '../store/usePixelStore'
 
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

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
  const gridColor = usePixelStore(s => s.gridColor)
  const gridAlpha = usePixelStore(s => s.gridAlpha)
  const gridMinScale = usePixelStore(s => s.gridMinScale)
  const selection = usePixelStore(s => s.selection)
  const startSelection = usePixelStore(s => s.startSelection)
  const updateSelection = usePixelStore(s => s.updateSelection)

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
      // full redraw via ImageData for performance
      const img = octx.createImageData(width, height)
      const data = img.data
      const pal = palette.map(hexToRgb)
      for (let i = 0, p = 0; i < pixels.length; i++, p += 4) {
        const c = pal[pixels[i]] || [0, 0, 0]
        data[p] = c[0]
        data[p + 1] = c[1]
        data[p + 2] = c[2]
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
  }, [viewport, hover, setCanvasSize, showGrid, gridColor, gridAlpha, gridMinScale, width, height, selection])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observeSize = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      setCanvasSize(rect.width, rect.height)
    })
    observeSize.observe(canvas)

    const pointers = new Map<number, { x: number; y: number }>()
    let isPanning = false
    let isSelecting = false
    let lastX = 0
    let lastY = 0
    let touchMoved = false
    let pinchStartDist = 0
    let pinchStartScale = 1
    let pinchAnchor = { x: 0, y: 0 }
    let startX = 0
    let startY = 0
    let longPressTimer: number | null = null
    let longPressTriggered = false
    let lastTapTime = 0
    let lastTapX = 0
    let lastTapY = 0

    const clearLongPress = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    const getPointerInfo = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      const vp = usePixelStore.getState().viewport
      const gx = Math.floor((x - vp.offsetX) / vp.scale)
      const gy = Math.floor((y - vp.offsetY) / vp.scale)
      return { rect, x, y, gx, gy, vp }
    }

    const onPointerDown = (e: PointerEvent) => {
      const info = getPointerInfo(e)
      if (e.pointerType === 'touch') {
        pointers.set(e.pointerId, { x: info.x, y: info.y })
        if (pointers.size === 2) {
          const arr = Array.from(pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          pinchStartDist = Math.hypot(dx, dy)
          pinchStartScale = info.vp.scale
          pinchAnchor = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 }
          isPanning = false
          isSelecting = false
        } else {
          const currTool = usePixelStore.getState().tool
          if (currTool === 'selectRect') {
            isSelecting = true
            startSelection(info.gx, info.gy)
          } else {
            isPanning = true
            startX = info.x
            startY = info.y
            lastX = info.x
            lastY = info.y
            touchMoved = false
            longPressTriggered = false
            clearLongPress()
            longPressTimer = window.setTimeout(() => {
              const vp = usePixelStore.getState().viewport
              const gx = Math.floor((info.x - vp.offsetX) / vp.scale)
              const gy = Math.floor((info.y - vp.offsetY) / vp.scale)
              usePixelStore.getState().pickColor(gx, gy)
              longPressTriggered = true
            }, 450)
          }
        }
        canvas.setPointerCapture(e.pointerId)
        return
      }

      if (e.button === 0) {
        const currTool = usePixelStore.getState().tool
        if (currTool === 'selectRect') {
          isSelecting = true
          startSelection(info.gx, info.gy)
        } else if (e.altKey) {
          usePixelStore.getState().pickColor(info.gx, info.gy)
        } else {
          usePixelStore.getState().placePixel(info.gx, info.gy)
        }
        canvas.setPointerCapture(e.pointerId)
        return
      }

      if (e.button === 1 || e.button === 2) {
        isPanning = true
        lastX = info.x
        lastY = info.y
        canvas.setPointerCapture(e.pointerId)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const info = getPointerInfo(e)
      const state = usePixelStore.getState()
      if (info.gx >= 0 && info.gy >= 0 && info.gx < state.width && info.gy < state.height) {
        setHover({ x: info.gx, y: info.gy })
      } else {
        setHover(null)
      }

      if (e.pointerType === 'touch') {
        pointers.set(e.pointerId, { x: info.x, y: info.y })
        if (pointers.size === 2 && pinchStartDist > 0) {
          const arr = Array.from(pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          const dist = Math.hypot(dx, dy)
          const factor = dist / Math.max(1, pinchStartDist)
          state.setScale(pinchStartScale * factor, pinchAnchor)
          return
        }

        if (isSelecting) {
          updateSelection(info.gx, info.gy)
          touchMoved = true
          return
        }

        if (isPanning) {
          if (!touchMoved) {
            const dist = Math.hypot(info.x - startX, info.y - startY)
            if (dist > 5) {
              touchMoved = true
              clearLongPress()
            }
          }
          state.panBy(info.x - lastX, info.y - lastY)
          lastX = info.x
          lastY = info.y
        }
        return
      }

      if (isSelecting && (e.buttons & 1 || e.type === 'pointerup')) {
        updateSelection(info.gx, info.gy)
        return
      }

      if (isPanning && (e.buttons & (1 | 2 | 4))) {
        state.panBy(info.x - lastX, info.y - lastY)
        lastX = info.x
        lastY = info.y
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const info = getPointerInfo(e)
      const state = usePixelStore.getState()

      if (e.pointerType === 'touch') {
        pointers.delete(e.pointerId)
        if (pointers.size < 2) {
          pinchStartDist = 0
        }
        canvas.releasePointerCapture(e.pointerId)

        if (isSelecting) {
          updateSelection(info.gx, info.gy)
          isSelecting = false
          touchMoved = false
          clearLongPress()
          return
        }

        const wasTap = !touchMoved && !longPressTriggered
        const now = performance.now()
        if (wasTap) {
          const dt = now - lastTapTime
          const dist = Math.hypot(info.x - lastTapX, info.y - lastTapY)
          if (dt < 300 && dist < 20) {
            const nextScale = state.viewport.scale > 1.5 ? 1 : Math.min(16, state.viewport.scale * 2)
            state.setScale(nextScale, { x: info.x, y: info.y })
          } else {
            if (state.tool === 'selectRect') {
              startSelection(info.gx, info.gy)
              updateSelection(info.gx, info.gy)
            } else {
              state.placePixel(info.gx, info.gy)
            }
          }
          lastTapTime = now
          lastTapX = info.x
          lastTapY = info.y
        }

        clearLongPress()
        longPressTriggered = false
        isPanning = false
        touchMoved = false
        return
      }

      if (isSelecting) {
        updateSelection(info.gx, info.gy)
        isSelecting = false
      }

      if (isPanning) {
        isPanning = false
      }

      clearLongPress()
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {}
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1
      usePixelStore.getState().setScale(usePixelStore.getState().viewport.scale * factor, anchor)
    }

    const onPointerCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      clearLongPress()
      isPanning = false
      isSelecting = false
      touchMoved = false
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {}
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const onPointerLeave = () => setHover(null)

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      observeSize.disconnect()
      clearLongPress()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [setCanvasSize, startSelection, updateSelection])

  return (
    <div className="w-full h-full bg-neutral-900">
      <canvas ref={canvasRef} className="w-full h-full touch-none" />
    </div>
  )
}
