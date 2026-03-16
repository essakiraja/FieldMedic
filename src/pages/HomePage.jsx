/**
 * FieldMedic — Home Page
 * Landing screen. Big, clear, fast to act on.
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '@/store'
import { useOfflineMode } from '@/hooks/useOfflineMode'
import { OFFLINE_SCENARIOS } from '@/config'
import ConnectionBadge from '@/components/ConnectionBadge'
import DemoMode from '@/components/DemoMode'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate    = useNavigate()
  const startSession = useStore((s) => s.startSession)
  const addToast    = useStore((s) => s.addToast)
  const { connectionQuality } = useOfflineMode()

  const handleStart = () => {
    // On HTTP (non-HTTPS) mobile browsers, geolocation is blocked silently —
    // neither success nor error fires. We navigate immediately and try to
    // attach location in the background if it becomes available.
    startSession(null)
    navigate('/triage')

    // Background location attempt — won't block navigation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Update session with location after the fact
          useStore.getState().updateSession({
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          })
        },
        () => {}, // silently ignore — location is optional
        { timeout: 4000, maximumAge: 60000 }
      )
    }
  }

  const handleOfflineScenario = (key) => {
    startSession(null)
    navigate('/guidance', { state: { offlineCategory: key } })
  }

  return (
    <div className={styles.page}>

      {/* Background grid */}
      <div className={styles.grid} aria-hidden />

      <div className={styles.content}>

        {/* Header */}
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✚</span>
            <span className={styles.logoText}>FieldMedic</span>
          </div>
          <ConnectionBadge />
        </motion.header>

        {/* Hero */}
        <motion.div
          className={styles.hero}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className={styles.eyebrow}>AI Emergency Agent</p>
          <h1 className={styles.headline}>
            Help is here.<br />
            <span className={styles.highlight}>Right now.</span>
          </h1>
          <p className={styles.subline}>
            Point your camera. Speak what you see.<br />
            Receive expert guidance in any language — online or offline.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <button className={styles.emergencyBtn} onClick={handleStart}>
            <span className={styles.btnPulse} />
            <span className={styles.btnContent}>
              <span className={styles.btnIcon}>✚</span>
              Start Emergency Assessment
            </span>
          </button>
        </motion.div>

        {/* Offline quick-access scenarios */}
        <motion.div
          className={styles.scenarios}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className={styles.scenariosLabel}>Quick guide — works offline</p>
          <div className={styles.scenarioGrid}>
            {Object.entries(OFFLINE_SCENARIOS).map(([key, scenario]) => (
              <button
                key={key}
                className={styles.scenarioBtn}
                onClick={() => handleOfflineScenario(key)}
              >
                <span className={styles.scenarioIcon}>{scenario.icon}</span>
                <span className={styles.scenarioLabel}>{scenario.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Responder link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <button
            className={styles.responderLink}
            onClick={() => navigate('/responder')}
          >
            Medical professional? Open responder dashboard →
          </button>
        </motion.div>

      </div>
      <DemoMode />
    </div>
  )
}
