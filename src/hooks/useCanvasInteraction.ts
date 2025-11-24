import { useEffect, useRef } from 'react'
import usePixelStore from '../store/usePixelStore'
import { clamp } from '../utils/math'

export interface InteractionState {
  hoverRef: React.MutableRefObject<{ x: number, y: number } | null>
  isSpacePressedRef: React.MutableRefObject<boolean>
}

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  const hoverRef = useRef<{ x: number, y: number } | null>(null)
  const isSpacePressedRef = useRef(false)
  
  // Manage Space key for panning
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        isSpacePressedRef.current = true
        // Force a cursor update if needed, though RAF will handle visual
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false
        if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair'
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [canvasRef])

  // Pointer Events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // State specific to gesture/interaction session
    const pointerState = {
      pointers: new Map<number, { x: number; y: number }>(),
      isPanning: false,
      isDrawing: false,
      isSelecting: false,
      lastX: 0,
      lastY: 0,
      touchMoved: false,
      pinchStartDist: 0,
      pinchStartScale: 1,
      pinchStartCenter: { x: 0, y: 0 },
      pinchStartViewport: { scale: 1, offsetX: 0, offsetY: 0 },
      pinchStartWorld: { x: 0, y: 0 },
      longPressTimer: null as number | null,
      longPressTriggered: false,
    }

    const clearLongPress = () => {
      if (pointerState.longPressTimer) {
        window.clearTimeout(pointerState.longPressTimer)
        pointerState.longPressTimer = null
      }
    }

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const toGrid = (clientX: number, clientY: number) => {
      const { x, y } = toLocal(clientX, clientY)
      const vp = usePixelStore.getState().viewport
      const gx = Math.floor((x - vp.offsetX) / vp.scale)
      const gy = Math.floor((y - vp.offsetY) / vp.scale)
      return { x, y, gx, gy }
    }

    const onPointerDown = (e: PointerEvent) => {
      const { x, y, gx, gy } = toGrid(e.clientX, e.clientY)
      
      // Touch Handling
      if (e.pointerType === 'touch') {
        pointerState.pointers.set(e.pointerId, { x, y })
        if (pointerState.pointers.size === 2) {
          // Pinch Start
          const arr = Array.from(pointerState.pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          const cx = (arr[0].x + arr[1].x) / 2
          const cy = (arr[0].y + arr[1].y) / 2
          
          const vp = usePixelStore.getState().viewport
          pointerState.pinchStartDist = Math.hypot(dx, dy)
          pointerState.pinchStartScale = vp.scale
          pointerState.pinchStartCenter = { x: cx, y: cy }
          pointerState.pinchStartViewport = { ...vp }
          // Calculate world coordinate under the pinch center
          pointerState.pinchStartWorld = {
            x: (cx - vp.offsetX) / vp.scale,
            y: (cy - vp.offsetY) / vp.scale
          }
          
          pointerState.touchMoved = true
          clearLongPress()
        } else if (pointerState.pointers.size === 1) {
          // Single Touch Start
          pointerState.isPanning = true
          pointerState.lastX = x
          pointerState.lastY = y
          pointerState.touchMoved = false
          pointerState.longPressTriggered = false
          clearLongPress()
          // Long press to pick color
          pointerState.longPressTimer = window.setTimeout(() => {
            usePixelStore.getState().pickColor(gx, gy)
            pointerState.longPressTriggered = true
            if (navigator.vibrate) navigator.vibrate(50)
          }, 450)
        }
        canvas.setPointerCapture(e.pointerId)
        return
      }

      // Mouse Handling
      const isSpace = isSpacePressedRef.current
      if (e.button === 0 && !isSpace) {
        const currTool = usePixelStore.getState().tool
        if (currTool === 'selectRect') {
          usePixelStore.getState().startSelection(gx, gy)
          pointerState.isSelecting = true
        } else if (e.altKey) {
          usePixelStore.getState().pickColor(gx, gy)
        } else {
          usePixelStore.getState().placePixel(gx, gy)
          pointerState.isDrawing = true
        }
        canvas.setPointerCapture(e.pointerId)
      } else if (e.button === 1 || e.button === 2 || isSpace) {
        pointerState.isPanning = true
        canvas.setPointerCapture(e.pointerId)
      }
      pointerState.lastX = x
      pointerState.lastY = y
    }

    const onPointerMove = (e: PointerEvent) => {
      const { x, y, gx, gy } = toGrid(e.clientX, e.clientY)
      const { width, height } = usePixelStore.getState()

      // Update Hover Ref
      if (gx >= 0 && gy >= 0 && gx < width && gy < height) {
        // Only update if changed to avoid thrashing (though Ref assign is cheap)
        if (!hoverRef.current || hoverRef.current.x !== gx || hoverRef.current.y !== gy) {
          hoverRef.current = { x: gx, y: gy }
        }
      } else {
        hoverRef.current = null
      }

      // Touch Move
      if (e.pointerType === 'touch') {
        pointerState.pointers.set(e.pointerId, { x, y })
        
        if (pointerState.pointers.size === 2) {
          // Pinch Update (Simultaneous Pan & Zoom)
          const arr = Array.from(pointerState.pointers.values())
          const dx = arr[0].x - arr[1].x
          const dy = arr[0].y - arr[1].y
          const dist = Math.hypot(dx, dy)
          const cx = (arr[0].x + arr[1].x) / 2
          const cy = (arr[0].y + arr[1].y) / 2

          const base = pointerState.pinchStartDist || dist
          const factor = dist / Math.max(1, base)
          const ns = clamp(pointerState.pinchStartViewport.scale * factor, 1, 64)
          
          // We want the world point that was under the pinch center at start
          // to be under the current pinch center now.
          const wx = pointerState.pinchStartWorld.x
          const wy = pointerState.pinchStartWorld.y
          
          const nx = cx - wx * ns
          const ny = cy - wy * ns
          
          usePixelStore.getState().setViewport({ scale: ns, offsetX: nx, offsetY: ny })
          pointerState.touchMoved = true
          return
        }
        
        if (pointerState.isPanning) {
          const dx = x - pointerState.lastX
          const dy = y - pointerState.lastY
          // Threshold to ignore micro-movements for tap detection
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            pointerState.touchMoved = true
            clearLongPress()
          }
          usePixelStore.getState().panBy(dx, dy)
          pointerState.lastX = x
          pointerState.lastY = y
        }
        return
      }

      // Mouse Move
      if (pointerState.isSelecting) {
        usePixelStore.getState().updateSelection(gx, gy)
        pointerState.lastX = x
        pointerState.lastY = y
        return
      }

      if (pointerState.isDrawing && (e.buttons & 1)) {
        usePixelStore.getState().placePixel(gx, gy)
      }

      const panButtons = e.buttons & (2 | 4) // Middle or Right
      if (pointerState.isPanning || panButtons) {
        const dx = x - pointerState.lastX
        const dy = y - pointerState.lastY
        usePixelStore.getState().panBy(dx, dy)
        pointerState.lastX = x
        pointerState.lastY = y
      }
    }

    const finishPointer = (e: PointerEvent) => {
      clearLongPress()
      
      if (e.pointerType === 'touch') {
        pointerState.pointers.delete(e.pointerId)
        if (pointerState.pointers.size < 2) {
          pointerState.pinchStartDist = 0
        }
        // If it was a tap (no move, no long press)
        if (!pointerState.touchMoved && !pointerState.longPressTriggered) {
          const { gx, gy } = toGrid(e.clientX, e.clientY)
          // For touch, we always place on tap if within bounds
          const { width, height } = usePixelStore.getState()
          if (gx >= 0 && gy >= 0 && gx < width && gy < height) {
             usePixelStore.getState().placePixel(gx, gy)
          }
        }
        pointerState.isPanning = false
        pointerState.touchMoved = false
        pointerState.longPressTriggered = false
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId)
        }
        return
      }

      if (pointerState.isSelecting) {
        const { gx, gy } = toGrid(e.clientX, e.clientY)
        usePixelStore.getState().updateSelection(gx, gy)
      }
      pointerState.isSelecting = false
      pointerState.isDrawing = false
      pointerState.isPanning = false
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    const onPointerUp = (e: PointerEvent) => finishPointer(e)
    const onPointerCancel = (e: PointerEvent) => finishPointer(e)
    
    const onPointerLeave = () => {
      hoverRef.current = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const anchor = toLocal(e.clientX, e.clientY)
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1
      const currentScale = usePixelStore.getState().viewport.scale
      const ns = currentScale * factor
      usePixelStore.getState().setScale(ns, anchor)
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      clearLongPress()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [canvasRef]) // Only re-run if canvas ref changes (almost never)

  return { hoverRef, isSpacePressedRef }
}
