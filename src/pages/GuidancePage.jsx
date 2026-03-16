/**
 * FieldMedic — Guidance Page
 *
 * Delivers step-by-step emergency instructions.
 * Each step is spoken aloud. User taps to advance.
 * Works fully offline via pre-loaded decision tree.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { useLanguageDetection } from '@/hooks/useLanguageDetection'
import { useOfflineMode } from '@/hooks/useOfflineMode'
import { getGuidance, syncCase } from '@/api/client'
import SeverityBadge from '@/components/SeverityBadge'
import ProgressTrack from '@/components/ProgressTrack'
import QRShare from '@/components/QRShare'
import ChatPanel from '@/components/ChatPanel'
import { useAdaptiveGuidance } from '@/hooks/useAdaptiveGuidance'
import styles from './GuidancePage.module.css'

export default function GuidancePage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [steps, setSteps]       = useState([])
  const [current, setCurrent]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [callEmergency, setCallEmergency] = useState(false)
  const [emergencyNote, setEmergencyNote] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [completed, setCompleted] = useState(false)
  const audioRef = useRef(null)

  const session        = useStore((s) => s.session)
  const triageResult   = useStore((s) => s.triageResult)
  const addToast       = useStore((s) => s.addToast)
  const updateSession  = useStore((s) => s.updateSession)
  const { getOfflineGuidance } = useOfflineMode()
  const { speakInLanguage, voiceLanguage } = useLanguageDetection()

  // State passed from TriagePage
  const passedTriage   = location.state?.triageResult
  const offlineCategory = location.state?.offlineCategory
  const passedGuidance  = location.state?.guidance || location.state?.demoGuidance
  const isDemoMode      = location.state?.isDemoMode || false

  const { checkIn, isAdapting, checkForTrigger, handleCheckInAnswer, dismissCheckIn } =
    useAdaptiveGuidance({
      triage: passedTriage || triageResult,
      onNewSteps: (newSteps, options) => {
        // Normalize steps — may be strings or objects
        const normalized = newSteps.map((step, i) =>
          typeof step === 'string'
            ? { index: i, instruction: step, is_critical: i === 0 }
            : step
        )
        setSteps(normalized)
        // Continue from the step after the check-in trigger — never reset to 0
        const continueFrom = options?.continueFrom ?? 1
        setCurrent(Math.min(continueFrom, normalized.length - 1))
      },
      onAdvance: () => {
        setCurrent((c) => {
          if (c < steps.length - 1) return c + 1
          saveAndComplete()
          return c
        })
      },
    })

  // ─── Load guidance on mount ─────────────────────────────────────────────

  useEffect(() => {
    loadGuidance()
  }, [])

  const loadGuidance = async () => {
    setLoading(true)
    try {
      // Case 1: pre-loaded guidance passed directly (demo or offline)
      if (passedGuidance) {
        // Steps may be objects {index, instruction, is_critical} or plain strings
        const normalized = passedGuidance.steps.map((step, i) =>
          typeof step === 'string'
            ? { index: i, instruction: step, is_critical: i === 0 }
            : step  // already a proper step object — use as-is
        )
        setSteps(normalized)
        setCallEmergency(passedGuidance.call_emergency ?? true)
        setEmergencyNote(passedGuidance.emergency_note || '')
        setIsOffline(passedGuidance.is_offline ?? false)
        setLoading(false)
        return
      }

      // Case 2: offline category only — build from tree
      if (offlineCategory && !passedTriage) {
        const fallback = getOfflineGuidance(offlineCategory)
        setSteps(fallback.steps.map((instruction, i) => ({
          index: i, instruction, is_critical: i === 0,
        })))
        setCallEmergency(true)
        setIsOffline(true)
        setLoading(false)
        return
      }

      // Case 3: full online triage result — fetch AI guidance
      const triage = passedTriage || triageResult
      if (!triage) {
        navigate('/')
        return
      }

      const response = await getGuidance(triage, session?.language || 'en')
      setSteps(response.steps)
      setCallEmergency(response.call_emergency)
      setEmergencyNote(response.emergency_note || '')
      setIsOffline(false)

      // Sync case to Firestore — update session first so we send complete data
      if (session) {
        const updatedSession = {
          ...session,
          status: 'active',
          severity: passedTriage?.severity || session.severity,
          category: passedTriage?.injury_type || session.category,
          guidanceSteps: response.steps,
        }
        updateSession({ status: 'active', guidanceSteps: response.steps })
        syncCase(updatedSession).catch((e) => console.warn('[syncCase]', e))
      }

    } catch (err) {
      // Graceful fallback to offline tree
      const category = offlineCategory || passedTriage?.injury_type || 'bleeding'
      const fallback = getOfflineGuidance(category)
      setSteps(fallback.steps.map((instruction, i) => ({
        index: i, instruction, is_critical: i === 0,
      })))
      setCallEmergency(true)
      setIsOffline(true)
      addToast({ type: 'warning', message: 'Using offline guidance.' })
    } finally {
      setLoading(false)
    }
  }

  // ─── Play audio for current step ────────────────────────────────────────

  useEffect(() => {
    const step = steps[current]
    if (!step) return

    if (step.audio_url) {
      // Pre-generated TTS from backend
      if (audioRef.current) {
        audioRef.current.src = step.audio_url
        audioRef.current.play().catch(() => {})
      }
    } else {
      // Browser TTS fallback
      speakText(step.instruction)
    }
  }, [current, steps])

  const speakText = (text) => speakInLanguage(text, voiceLanguage)

  // ─── Navigation ──────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    window.speechSynthesis?.cancel()
    const triage = passedTriage || triageResult
    const category = triage?.injury_type || ''
    // Check if this step triggers an adaptive check-in
    const triggered = checkForTrigger(current, category)
    if (triggered) return // pause navigation until check-in answered

    if (current < steps.length - 1) {
      setCurrent((c) => c + 1)
    } else {
      saveAndComplete()
    }
  }, [current, steps.length, checkForTrigger, passedTriage, triageResult])

  const saveAndComplete = useCallback(() => {
    const s = useStore.getState().session
    console.log('[saveAndComplete] session=', s?.id, 'steps=', steps.length)
    if (s?.id) {
      const payload = {
        id:             s.id,
        startedAt:      s.startedAt,
        status:         'active',
        location:       s.location || null,
        severity:       passedTriage?.severity || s.severity || 'unknown',
        category:       passedTriage?.injury_type || s.category || null,
        images:         s.images || [],
        transcripts:    s.transcripts || [],
        guidanceSteps:  steps,
        responderAlerted: false,
      }
      syncCase(payload)
        .then((r) => console.log('[saveAndComplete] success:', r))
        .catch((e) => console.error('[saveAndComplete] FAILED:', e))
    } else {
      console.warn('[saveAndComplete] no session id — not saving')
    }
    setCompleted(true)
  }, [steps, passedTriage])

  const goPrev = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (current > 0) setCurrent((c) => c - 1)
  }, [current])

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      if (e.key === 'ArrowLeft')  goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  const currentStep = steps[current]
  const triage = passedTriage || triageResult

  if (loading) return <LoadingScreen />

  if (completed) return (
    <CompletedScreen
      callEmergency={callEmergency}
      emergencyNote={emergencyNote}
      onRestart={() => { setCurrent(0); setCompleted(false) }}
      onHome={() => navigate('/')}
      session={session}
      onSave={saveAndComplete}
    />
  )

  return (
    <div className={styles.page}>
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/triage')}>
          ← Retriage
        </button>

        <div className={styles.headerCenter}>
          {triage && <SeverityBadge severity={triage.severity} />}
          {isOffline && (
            <span className={styles.offlineBadge}>⚡ Offline mode</span>
          )}
        </div>

        <span className={styles.stepCounter}>
          {current + 1} / {steps.length}
        </span>
      </div>

      {/* Emergency alert banner */}
      {callEmergency && (
        <motion.div
          className={styles.emergencyBanner}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className={styles.emergencyIcon}>📞</span>
          <span>{emergencyNote || 'Call emergency services immediately.'}</span>
          <a href="tel:911" className={styles.callBtn}>Call 911</a>
        </motion.div>
      )}

      {/* Progress track */}
      <ProgressTrack total={steps.length} current={current} steps={steps} />

      {/* Step card */}
      <div className={styles.stepArea}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className={`${styles.stepCard} ${currentStep?.is_critical ? styles.critical : ''}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <div className={styles.stepNumber}>
              <span>{current + 1}</span>
            </div>

            {currentStep?.is_critical && (
              <span className={styles.criticalTag}>⚠ Critical step</span>
            )}

            <p className={styles.stepText}>{currentStep?.instruction}</p>

            {/* Audio replay button */}
            <button
              className={styles.replayBtn}
              onClick={() => currentStep && speakText(currentStep.instruction)}
              title="Replay audio"
            >
              🔊 Repeat
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Adaptive check-in question */}
      {checkIn && (
        <div className={styles.checkInCard}>
          <p className={styles.checkInQuestion}>{checkIn.question}</p>
          <div className={styles.checkInActions}>
            <button
              className={styles.checkInYes}
              onClick={() => handleCheckInAnswer('Yes')}
            >
              Yes
            </button>
            <button
              className={styles.checkInNo}
              onClick={() => handleCheckInAnswer('No')}
            >
              No
            </button>
            <button
              className={styles.checkInSkip}
              onClick={dismissCheckIn}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Adapting indicator */}
      {isAdapting && (
        <div className={styles.adaptingRow}>
          <div className={styles.adaptingSpinner} />
          <span>Adapting guidance to your situation…</span>
        </div>
      )}

      {/* Navigation */}
      <div className={styles.navArea}>
        <button
          className={styles.prevBtn}
          onClick={goPrev}
          disabled={current === 0}
        >
          ← Prev
        </button>

        <button className={styles.nextBtn} onClick={goNext}>
          {current < steps.length - 1 ? 'Next step →' : 'Complete ✓'}
        </button>
      </div>

      {/* Live doctor chat */}
      {session?.id && (
        <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
          <ChatPanel caseId={session.id} role="bystander" compact />
        </div>
      )}

      {/* All steps overview */}
      <div className={styles.allSteps}>
        <p className={styles.allStepsLabel}>All steps</p>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.stepRow} ${i === current ? styles.stepRowActive : ''} ${i < current ? styles.stepRowDone : ''}`}
            onClick={() => { window.speechSynthesis?.cancel(); setCurrent(i) }}
          >
            <span className={styles.stepRowNum}>{i + 1}</span>
            <span className={styles.stepRowText}>{step.instruction}</span>
            {i < current && <span className={styles.stepRowCheck}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Loading screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingSpinner} />
      <p className={styles.loadingText}>Preparing guidance…</p>
    </div>
  )
}

// ─── Completed screen ────────────────────────────────────────────────────────

function CompletedScreen({ callEmergency, emergencyNote, onRestart, onHome, session, onSave }) {
  return (
    <motion.div
      className={styles.completedPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={styles.completedIcon}>✓</div>
      <h2 className={styles.completedTitle}>All steps completed</h2>
      <p className={styles.completedSub}>
        Keep monitoring the person until professional help arrives.
      </p>

      {callEmergency && (
        <a href="tel:911" className={styles.bigCallBtn}>
          📞 Call Emergency Services
        </a>
      )}

      <div className={styles.completedActions}>
        <button className={styles.secondaryBtn} onClick={onRestart}>
          Restart steps
        </button>
        <button className={styles.secondaryBtn} onClick={onHome}>
          Return home
        </button>
      </div>

      {session?.id && (
        <QRShare caseId={session.id} severity={session.severity} />
      )}

      {onSave && (
        <button
          className={styles.secondaryBtn}
          style={{ marginTop: 4 }}
          onClick={onSave}
        >
          ↺ Regenerate QR / retry save
        </button>
      )}
    </motion.div>
  )
}
