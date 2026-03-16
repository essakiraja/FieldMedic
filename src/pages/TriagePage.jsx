/**
 * FieldMedic — Triage Page
 *
 * The primary emergency screen. Two modes:
 *   1. Camera → capture wound photo → send to Gemini Vision
 *   2. Voice → describe the situation → Gemini Live responds
 *
 * Falls back to offline decision tree if network unavailable.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCamera } from '@/hooks/useCamera'
import { useGeminiLive } from '@/hooks/useGeminiLive'
import { useOfflineMode } from '@/hooks/useOfflineMode'
import { useStore } from '@/store'
import { analyzeTriage, getGuidance } from '@/api/client'
import { AGENT_PROMPTS } from '@/config'
import VoiceOrb from '@/components/VoiceOrb'
import SeverityBadge from '@/components/SeverityBadge'
import WoundHeatmap from '@/components/WoundHeatmap'
import styles from './TriagePage.module.css'

export default function TriagePage() {
  const navigate  = useNavigate()
  const [mode, setMode]           = useState('camera') // 'camera' | 'voice'
  const [phase, setPhase]         = useState('idle')   // 'idle' | 'capturing' | 'analyzing' | 'done'
  const [description, setDescription] = useState('')
  const fileInputRef = useRef(null)

  const session       = useStore((s) => s.session)
  const updateSession = useStore((s) => s.updateSession)
  const setTriageResult   = useStore((s) => s.setTriageResult)
  const setTriageLoading  = useStore((s) => s.setTriageLoading)
  const triageResult      = useStore((s) => s.triageResult)
  const addToast          = useStore((s) => s.addToast)

  const { connectionQuality, detectOfflineCategory, getOfflineGuidance } = useOfflineMode()
  const isOffline = connectionQuality === 'offline'

  const {
    videoRef, canvasRef,
    isActive, capturedImage, error: cameraError,
    startCamera, stopCamera, capturePhoto, uploadFile,
  } = useCamera()

  const {
    startListening, stopListening, sendText,
    isConnected, isListening, transcript, error: voiceError,
  } = useGeminiLive({
    systemPrompt: AGENT_PROMPTS.INTAKE,
    onMessage: ({ type, text }) => {
      if (type === 'text' && text) setDescription((prev) => prev + ' ' + text)
    },
  })

  // Start camera on mount
  useEffect(() => {
    if (mode === 'camera') startCamera()
    return () => stopCamera()
  }, [mode])

  // Guard: redirect home if no session
  useEffect(() => {
    if (!session) navigate('/')
  }, [session])

  // ─── Handle photo capture + triage ───────────────────────────────────────

  const handleCapture = async () => {
    const image = capturePhoto()
    if (!image) return

    setPhase('analyzing')
    setTriageLoading(true)

    try {
      if (isOffline) {
        // Offline: use category detected from description or default
        const category = detectOfflineCategory(description)
        const fallback = getOfflineGuidance(category)
        updateSession({ severity: 'serious', category })
        navigate('/guidance', { state: { offlineCategory: category, guidance: fallback } })
        return
      }

      const result = await analyzeTriage(image.base64, {
        language: 'en',
        summary: description || undefined,
      })

      setTriageResult(result)
      updateSession({ severity: result.severity, category: result.injury_type })
      setPhase('done')

    } catch (err) {
      addToast({ type: 'error', message: 'Analysis failed. Switching to offline mode.' })
      const category = detectOfflineCategory(description)
      navigate('/guidance', { state: { offlineCategory: category } })
    }
  }

  // ─── Proceed to guidance after triage ────────────────────────────────────

  const handleProceed = () => {
    if (triageResult) {
      navigate('/guidance', { state: { triageResult } })
    }
  }

  // ─── Voice mode submit ────────────────────────────────────────────────────

  const handleVoiceSubmit = async () => {
    if (!description.trim()) return
    stopListening()
    setPhase('analyzing')

    try {
      if (isOffline) {
        const category = detectOfflineCategory(description)
        navigate('/guidance', { state: { offlineCategory: category } })
        return
      }

      // Use text description alone if no image available
      const result = await analyzeTriage('', {
        language: 'en',
        summary: description,
      })

      setTriageResult(result)
      updateSession({ severity: result.severity, category: result.injury_type })
      setPhase('done')

    } catch {
      const category = detectOfflineCategory(description)
      navigate('/guidance', { state: { offlineCategory: category } })
    }
  }

  const analyzing = phase === 'analyzing'

  return (
    <div className={styles.page}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Back
        </button>
        <span className={styles.topTitle}>Emergency Assessment</span>
        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'camera' ? styles.active : ''}`}
            onClick={() => setMode('camera')}
          >📷 Camera</button>
          <button
            className={`${styles.modeTab} ${mode === 'voice' ? styles.active : ''}`}
            onClick={() => setMode('voice')}
          >🎙 Voice</button>
        </div>
      </div>

      {/* Camera mode */}
      <AnimatePresence mode="wait">
        {mode === 'camera' && (
          <motion.div
            key="camera"
            className={styles.cameraView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Live video feed */}
            {!capturedImage && (
              <div className={styles.videoWrapper}>
                <video
                  ref={videoRef}
                  className={styles.video}
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Targeting overlay */}
                <div className={styles.targetOverlay}>
                  <div className={styles.targetCorner} data-pos="tl" />
                  <div className={styles.targetCorner} data-pos="tr" />
                  <div className={styles.targetCorner} data-pos="bl" />
                  <div className={styles.targetCorner} data-pos="br" />
                </div>

                <p className={styles.cameraHint}>
                  Frame the wound or injury clearly
                </p>

                {cameraError && (
                  <div className={styles.cameraError}>
                    {cameraError}
                    <button onClick={() => fileInputRef.current?.click()}>
                      Upload image instead
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0])}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Captured image preview — with heatmap overlay when result available */}
            {capturedImage && phase !== 'done' && (
              <div className={styles.previewWrapper}>
                <img
                  src={capturedImage.dataUrl}
                  alt="Captured wound"
                  className={styles.preview}
                />
                {analyzing && (
                  <div className={styles.analyzingOverlay}>
                    <div className={styles.spinner} />
                    <p>Analyzing with Gemini Vision…</p>
                  </div>
                )}
              </div>
            )}

            {/* Wound heatmap overlay — shown after triage result */}
            {capturedImage && phase === 'done' && triageResult && (
              <WoundHeatmap
                imageDataUrl={capturedImage.dataUrl}
                triageResult={triageResult}
              />
            )}

            {/* Triage result */}
            {phase === 'done' && triageResult && (
              <motion.div
                className={styles.resultCard}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SeverityBadge severity={triageResult.severity} />
                <p className={styles.observation}>{triageResult.observation}</p>
                {triageResult.immediate_dangers?.length > 0 && (
                  <div className={styles.dangers}>
                    {triageResult.immediate_dangers.map((d, i) => (
                      <span key={i} className={styles.dangerTag}>⚠ {d}</span>
                    ))}
                  </div>
                )}
                <div className={styles.firstAction}>
                  <span className={styles.firstActionLabel}>Do this now</span>
                  <p className={styles.firstActionText}>{triageResult.first_action}</p>
                </div>
              </motion.div>
            )}

            {/* Description input */}
            <div className={styles.descriptionRow}>
              <input
                className={styles.descriptionInput}
                placeholder="Describe what happened (optional)…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              {phase !== 'done' && !capturedImage && (
                <button className={styles.captureBtn} onClick={handleCapture}>
                  <span className={styles.captureRing} />
                  <span className={styles.captureDot} />
                </button>
              )}
              {capturedImage && phase !== 'done' && !analyzing && (
                <>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => { window.location.reload() }}
                  >
                    Retake
                  </button>
                  <button className={styles.primaryBtn} onClick={handleCapture}>
                    Analyze Wound
                  </button>
                </>
              )}
              {phase === 'done' && (
                <button className={styles.primaryBtn} onClick={handleProceed}>
                  Get Step-by-Step Guidance →
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Voice mode */}
        {mode === 'voice' && (
          <motion.div
            key="voice"
            className={styles.voiceView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <VoiceOrb
              isListening={isListening}
              isSpeaking={false}
              onToggle={() => isListening ? stopListening() : startListening()}
            />

            <div className={styles.voicePrompt}>
              {!isListening && !transcript && (
                <p>Tap the orb and describe the emergency</p>
              )}
              {isListening && (
                <p className={styles.listeningText}>Listening…</p>
              )}
              {transcript && (
                <p className={styles.transcriptText}>{transcript}</p>
              )}
            </div>

            <textarea
              className={styles.voiceInput}
              placeholder="Or type the situation here…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            {analyzing && (
              <div className={styles.analyzingRow}>
                <div className={styles.spinner} />
                <span>Assessing situation…</span>
              </div>
            )}

            {phase === 'done' && triageResult && (
              <motion.div
                className={styles.resultCard}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SeverityBadge severity={triageResult.severity} />
                <p className={styles.observation}>{triageResult.observation}</p>
                <div className={styles.firstAction}>
                  <span className={styles.firstActionLabel}>Do this now</span>
                  <p className={styles.firstActionText}>{triageResult.first_action}</p>
                </div>
              </motion.div>
            )}

            <div className={styles.actions}>
              {phase !== 'done' && description && !analyzing && (
                <button className={styles.primaryBtn} onClick={handleVoiceSubmit}>
                  Assess Situation
                </button>
              )}
              {phase === 'done' && (
                <button className={styles.primaryBtn} onClick={handleProceed}>
                  Get Step-by-Step Guidance →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
