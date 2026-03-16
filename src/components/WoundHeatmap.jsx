/**
 * FieldMedic — Wound Heatmap Overlay
 *
 * Draws a color-coded severity overlay on the captured wound photo.
 * Uses wound_region coordinates from the Gemini Vision triage result
 * to position a pulsing circle over the wound area.
 *
 * Color maps to severity:
 *   critical → red pulse
 *   serious  → orange pulse
 *   moderate → yellow pulse
 *   minor    → green pulse
 */

import { useEffect, useRef } from 'react'
import styles from './WoundHeatmap.module.css'

const SEVERITY_COLORS = {
  critical: { fill: 'rgba(255, 77, 77, 0.35)',  stroke: '#ff4d4d', pulse: 'rgba(255,77,77,0.15)' },
  serious:  { fill: 'rgba(255,140, 66, 0.35)',  stroke: '#ff8c42', pulse: 'rgba(255,140,66,0.15)' },
  moderate: { fill: 'rgba(255,209,102, 0.35)',  stroke: '#ffd166', pulse: 'rgba(255,209,102,0.15)' },
  minor:    { fill: 'rgba( 61,220,132, 0.35)',  stroke: '#3ddc84', pulse: 'rgba(61,220,132,0.15)' },
  unknown:  { fill: 'rgba(255,255,255, 0.2)',   stroke: '#ffffff', pulse: 'rgba(255,255,255,0.1)' },
}

export default function WoundHeatmap({ imageDataUrl, triageResult }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !imageDataUrl) return

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const img    = new Image()

    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight

      const severity    = triageResult?.severity || 'unknown'
      const woundRegion = triageResult?.wound_region
      const colors      = SEVERITY_COLORS[severity] || SEVERITY_COLORS.unknown

      let frame   = 0
      let running = true

      const draw = () => {
        if (!running) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw original photo
        ctx.drawImage(img, 0, 0)

        if (woundRegion) {
          const cx = woundRegion.x_pct * canvas.width
          const cy = woundRegion.y_pct * canvas.height
          const r  = woundRegion.radius_pct * Math.min(canvas.width, canvas.height)

          // Outer pulse ring — animated
          const pulseScale = 1 + Math.sin(frame * 0.08) * 0.15
          ctx.beginPath()
          ctx.arc(cx, cy, r * pulseScale * 1.6, 0, Math.PI * 2)
          ctx.fillStyle = colors.pulse
          ctx.fill()

          // Middle ring
          ctx.beginPath()
          ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2)
          ctx.fillStyle = colors.fill
          ctx.fill()

          // Core wound marker
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fillStyle = colors.fill
          ctx.strokeStyle = colors.stroke
          ctx.lineWidth = 3
          ctx.fill()
          ctx.stroke()

          // Crosshair lines
          const lineLen = r * 0.7
          ctx.strokeStyle = colors.stroke
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.8

          ctx.beginPath()
          ctx.moveTo(cx - lineLen, cy)
          ctx.lineTo(cx - r * 0.3, cy)
          ctx.moveTo(cx + r * 0.3, cy)
          ctx.lineTo(cx + lineLen, cy)
          ctx.moveTo(cx, cy - lineLen)
          ctx.lineTo(cx, cy - r * 0.3)
          ctx.moveTo(cx, cy + r * 0.3)
          ctx.lineTo(cx, cy + lineLen)
          ctx.stroke()

          ctx.globalAlpha = 1.0

          // Severity label
          const label    = severity.toUpperCase()
          const fontSize = Math.max(14, r * 0.4)
          ctx.font      = `600 ${fontSize}px sans-serif`
          ctx.textAlign = 'center'

          // Label background pill
          const textW = ctx.measureText(label).width + 16
          const textH = fontSize + 8
          const lx    = cx
          const ly    = cy - r - fontSize

          ctx.fillStyle   = colors.stroke
          ctx.beginPath()
          ctx.roundRect(lx - textW / 2, ly - textH / 2, textW, textH, 4)
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.fillText(label, lx, ly + fontSize * 0.35)
        }

        frame++
        animFrameRef.current = requestAnimationFrame(draw)
      }

      draw()

      return () => {
        running = false
        cancelAnimationFrame(animFrameRef.current)
      }
    }

    img.src = imageDataUrl

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [imageDataUrl, triageResult])

  if (!imageDataUrl) return null

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {triageResult?.wound_region?.description && (
        <div className={styles.regionLabel}>
          <span className={styles.regionIcon}>⊕</span>
          {triageResult.wound_region.description}
        </div>
      )}
    </div>
  )
}
