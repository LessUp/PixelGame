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
  const tool = usePixelStore(s => s.tool)
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
  }, [viewport, hover, selection, setCanvasSize, showGrid, gridColor, gridAlpha, gridMinScale, width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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

    const toCanvasPoint = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const updateHoverFromPoint = (px: number, py: number) => {
      const vp = usePixelStore.getState().viewport
      const gx = Math.floor((px - vp.offsetX) / vp.scale)
      const gy = Math.floor((py - vp.offsetY) / vp.scale)
      if (gx >= 0 && gy >= 0 && gx < width && gy < height) {
        setHover({ x: gx, y: gy })
      } else {
        setHover(null)
      }
    }

    const finishPointer = (id: number) => {
      pointers.delete(id)
      if (pointers.size < 2) {
        pinchStartDist = 0
      }
      if (pointers.size === 0) {
        isPanning = false
        touchMoved = false
        pinchStartScale = 1
        pinchAnchor = { x: 0, y: 0 }
        clearLongPress()
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = toCanvasPoint(e.clientX, e.clientY)

      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        if ((e.buttons & 1) !== 0) {
          const store = usePixelStore.getState()
          const vp = store.viewport
          const gx = Math.floor((x - vp.offsetX) / vp.scale)
          const gy = Math.floor((y - vp.offsetY) / vp.scale)
          if (store.tool === 'selectRect' && store.selection) {
            store.updateSelection(gx, gy)
          } else if (e.altKey) {
            store.pickColor(gx, gy)
          } else {
            store.placePixel(gx, gy)
          }
        } else {
          updateHoverFromPoint(x, y)
        }
        return
      }

      if (e.pointerType === 'touch') {
        const prev = pointers.get(e.pointerId)
        pointers.set(e.pointerId, { x, y })

        if (pointers.size === 2) {
          const arr = Array.from(pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          const dist = Math.hypot(dx, dy)
          if (!pinchStartDist) {
            pinchStartDist = dist
            pinchStartScale = usePixelStore.getState().viewport.scale
          }
          pinchAnchor = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 }
          const factor = pinchStartDist ? dist / pinchStartDist : 1
          const ns = pinchStartScale * factor
          usePixelStore.getState().setScale(ns, pinchAnchor)
          touchMoved = true
          clearLongPress()
          return
        }

        if (!prev) return

        if (!touchMoved) {
          const dist = Math.hypot(x - startX, y - startY)
          if (dist > 6) {
            touchMoved = true
            clearLongPress()
          }
        }

        if (isPanning) {
          const dx = x - lastX
          const dy = y - lastY
          usePixelStore.getState().panBy(dx, dy)
        }

        if (usePixelStore.getState().tool === 'selectRect' && usePixelStore.getState().selection) {
          const vp = usePixelStore.getState().viewport
          const gx = Math.floor((x - vp.offsetX) / vp.scale)
          const gy = Math.floor((y - vp.offsetY) / vp.scale)
          updateSelection(gx, gy)
        }

        lastX = x
        lastY = y
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        const { x, y } = toCanvasPoint(e.clientX, e.clientY)
        updateHoverFromPoint(x, y)
      }

      if (e.pointerType === 'touch') {
        const { x, y } = toCanvasPoint(e.clientX, e.clientY)
        if (!touchMoved && !longPressTriggered) {
          const store = usePixelStore.getState()
          const vp = store.viewport
          const gx = Math.floor((x - vp.offsetX) / vp.scale)
          const gy = Math.floor((y - vp.offsetY) / vp.scale)
          if (store.tool === 'selectRect') {
            startSelection(gx, gy)
            store.updateSelection(gx, gy)
          } else {
            store.placePixel(gx, gy)
          }
        }
        clearLongPress()
      }

      finishPointer(e.pointerId)
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        clearLongPress()
      }
      finishPointer(e.pointerId)
    }

    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = toCanvasPoint(e.clientX, e.clientY)

      if (e.pointerType === 'touch') {
        pointers.set(e.pointerId, { x, y })

        if (pointers.size === 1) {
          const now = Date.now()
          const dt = now - lastTapTime
          const distTap = Math.hypot(x - lastTapX, y - lastTapY)
          if (dt < 300 && distTap < 20) {
            const store = usePixelStore.getState()
            const currentScale = store.viewport.scale
            const targetScale = currentScale >= 32 ? currentScale / 1.5 : currentScale * 1.5
            store.setScale(targetScale, { x, y })
            lastTapTime = 0
            touchMoved = true
            clearLongPress()
            return
          }

          lastTapTime = now
          lastTapX = x
          lastTapY = y

          isPanning = true
          lastX = x
          lastY = y
          startX = x
          startY = y
          touchMoved = false
          longPressTriggered = false
          clearLongPress()
          longPressTimer = window.setTimeout(() => {
            const vp = usePixelStore.getState().viewport
            const gx = Math.floor((x - vp.offsetX) / vp.scale)
            const gy = Math.floor((y - vp.offsetY) / vp.scale)
            usePixelStore.getState().pickColor(gx, gy)
            longPressTriggered = true
          }, 450)

          if (usePixelStore.getState().tool === 'selectRect') {
            const vp = usePixelStore.getState().viewport
            const gx = Math.floor((x - vp.offsetX) / vp.scale)
            const gy = Math.floor((y - vp.offsetY) / vp.scale)
            startSelection(gx, gy)
          }
        } else if (pointers.size === 2) {
          const arr = Array.from(pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          pinchStartDist = Math.hypot(dx, dy)
          pinchStartScale = usePixelStore.getState().viewport.scale
          pinchAnchor = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 }
          clearLongPress()
        }

        canvas.setPointerCapture(e.pointerId)
        return
      }

      if (e.button === 0) {
        const vp = usePixelStore.getState().viewport
        const gx = Math.floor((x - vp.offsetX) / vp.scale)
        const gy = Math.floor((y - vp.offsetY) / vp.scale)
        const currTool = usePixelStore.getState().tool
        if (currTool === 'selectRect') {
          startSelection(gx, gy)
        } else if (e.altKey) {
          usePixelStore.getState().pickColor(gx, gy)
        } else {
          usePixelStore.getState().placePixel(gx, gy)
        }
      }

      canvas.setPointerCapture(e.pointerId)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1
      const ns = usePixelStore.getState().viewport.scale * factor
      usePixelStore.getState().setScale(ns, anchor)
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      ro.disconnect()
      clearLongPress()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [setCanvasSize, startSelection, updateSelection, width, height, tool])

  return (
    <div className="w-full h-full bg-neutral-900">
      <canvas ref={canvasRef} className="w-full h-full touch-none" />
    </div>
  )
}
