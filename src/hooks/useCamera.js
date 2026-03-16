/**
 * FieldMedic — useCamera Hook
 *
 * Manages camera stream, photo capture, and image compression.
 * Returns base64-encoded JPEG ready for Gemini Vision API.
 *
 * Mobile notes:
 *  - getUserMedia requires HTTPS on real mobile browsers (not localhost).
 *    Over plain HTTP on a LAN IP, camera is blocked — file upload fallback shown.
 *  - video element needs playsinline + muted attributes for iOS autoplay.
 *  - Constraint fallback chain handles OverconstrainedError on some Android devices.
 */

import { useRef, useState, useCallback } from 'react'
import { TRIAGE } from '@/config'
import { useStore } from '@/store'

export function useCamera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState(null)

  const setCameraPermission = useStore((s) => s.setCameraPermission)
  const addImage = useStore((s) => s.addImage)

  // ─── Start camera stream ──────────────────────────────────────────────────

  const startCamera = useCallback(async (facingMode = 'environment') => {
    // getUserMedia is unavailable over plain HTTP on mobile (except localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera requires HTTPS. Please upload an image instead.')
      setCameraPermission('unavailable')
      return
    }

    // Constraint fallback chain — handles OverconstrainedError on some Android models
    const constraints = [
      { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode } },
      { video: true },
    ]

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint)
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Required for iOS Safari autoplay
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.muted = true
          await videoRef.current.play().catch(() => {})
        }

        setIsActive(true)
        setError(null)
        setCameraPermission('granted')
        return // success
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. You can upload an image instead.')
          setCameraPermission('denied')
          return // user denied — no point retrying constraints
        }
        // OverconstrainedError or NotFoundError — try next constraint
      }
    }

    setError('Camera unavailable. Please upload an image instead.')
    setCameraPermission('unavailable')
  }, [setCameraPermission])

  // ─── Stop camera stream ───────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
  }, [])

  // ─── Capture photo ────────────────────────────────────────────────────────

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const base64 = canvas.toDataURL(
      TRIAGE.IMAGE.FORMAT,
      TRIAGE.IMAGE.QUALITY
    )

    const raw = base64.split(',')[1]

    const imageData = {
      base64: raw,
      dataUrl: base64,
      capturedAt: new Date().toISOString(),
      width: canvas.width,
      height: canvas.height,
    }

    setCapturedImage(imageData)
    addImage(imageData)

    return imageData
  }, [addImage])

  // ─── Upload a file (primary path on HTTP mobile) ──────────────────────────

  const uploadFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Only image files are supported.'))
        return
      }

      if (file.size > TRIAGE.IMAGE.MAX_SIZE_BYTES) {
        reject(new Error('Image too large. Please use an image under 5MB.'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target.result
        const raw = dataUrl.split(',')[1]

        const imageData = {
          base64: raw,
          dataUrl,
          capturedAt: new Date().toISOString(),
          fromFile: true,
        }

        setCapturedImage(imageData)
        addImage(imageData)
        resolve(imageData)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [addImage])

  return {
    videoRef,
    canvasRef,
    isActive,
    capturedImage,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    uploadFile,
    clearCapture: () => setCapturedImage(null),
  }
}
