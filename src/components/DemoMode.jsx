/**
 * FieldMedic — Demo Mode
 *
 * A floating button + scenario selector that bypasses all API calls.
 * Injects pre-built triage + guidance data directly into the store.
 * Use during live demos to guarantee a flawless, network-independent presentation.
 *
 * Activated by pressing the "DEMO" button on the home screen.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { DEMO_SCENARIOS } from '@/config/demoScenarios'
import styles from './DemoMode.module.css'

export default function DemoMode() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const startSession    = useStore((s) => s.startSession)
  const setTriageResult = useStore((s) => s.setTriageResult)
  const updateSession   = useStore((s) => s.updateSession)

  const handleScenario = (scenario) => {
    setOpen(false)

    // Start a fresh session
    startSession(null)

    // Inject triage result into store — skips camera + API entirely
    setTriageResult(scenario.triage)
    updateSession({
      status: 'active',
      severity: scenario.triage.severity,
      category: scenario.triage.injury_type,
    })

    // Navigate to guidance with pre-loaded data
    navigate('/guidance', {
      state: {
        triageResult: scenario.triage,
        demoGuidance: scenario.guidance,
        isDemoMode: true,
      },
    })
  }

  return (
    <>
      {/* Floating DEMO button */}
      <button className={styles.demoTrigger} onClick={() => setOpen(true)}>
        <span className={styles.demoLabel}>DEMO</span>
      </button>

      {/* Scenario picker modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className={styles.panel}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Demo mode</h2>
                  <p className={styles.panelSub}>
                    Pre-loaded scenarios — no camera or API needed
                  </p>
                </div>
                <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
              </div>

              <div className={styles.scenarioList}>
                {Object.entries(DEMO_SCENARIOS).map(([key, scenario]) => (
                  <button
                    key={key}
                    className={styles.scenarioCard}
                    onClick={() => handleScenario(scenario)}
                  >
                    <span className={styles.scenarioIcon}>{scenario.icon}</span>
                    <div className={styles.scenarioInfo}>
                      <span className={styles.scenarioLabel}>{scenario.label}</span>
                      <span className={styles.scenarioDesc}>{scenario.description}</span>
                    </div>
                    <span className={`${styles.severityPill} ${styles[scenario.triage.severity]}`}>
                      {scenario.triage.severity}
                    </span>
                  </button>
                ))}
              </div>

              <p className={styles.panelFooter}>
                Demo mode bypasses all API calls — works fully offline
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
