/**
 * FieldMedic — Responder Dashboard
 *
 * Medical professional view. Shows all active emergency cases
 * in real time with triage summaries, locations, and timestamps.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '@/store'
import client from '@/api/client'
import SeverityBadge from '@/components/SeverityBadge'
import ChatPanel from '@/components/ChatPanel'
import styles from './ResponderPage.module.css'

const REFRESH_INTERVAL_MS = 15_000

export default function ResponderPage() {
  const navigate = useNavigate()
  const [cases, setCases]     = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selected, setSelected]   = useState(null)
  const addToast = useStore((s) => s.addToast)

  const fetchCases = async () => {
    try {
      const { data } = await client.get('/api/responder/cases')
      setCases(data.cases || [])
      setLastUpdated(new Date())
    } catch {
      addToast({ type: 'error', message: 'Failed to load cases. Check connection.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
    const interval = setInterval(fetchCases, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 }
  const sorted = [...cases].sort(
    (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  )

  return (
    <div className={styles.page}>

      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← FieldMedic</button>
          <h1 className={styles.title}>Responder Dashboard</h1>
          <div className={styles.liveRow}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>Live</span>
            {lastUpdated && (
              <span className={styles.lastUpdated}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          {['critical', 'serious', 'moderate'].map((sev) => (
            <div key={sev} className={`${styles.statBox} ${styles[sev]}`}>
              <span className={styles.statNum}>
                {cases.filter((c) => c.severity === sev).length}
              </span>
              <span className={styles.statLabel}>{sev}</span>
            </div>
          ))}
        </div>

        {/* Case list */}
        <div className={styles.caseList}>
          {loading && (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} /> Loading cases…
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div className={styles.emptyState}>
              No active cases
            </div>
          )}

          {sorted.map((c, i) => (
            <motion.button
              key={c.id}
              className={`${styles.caseCard} ${selected?.id === c.id ? styles.selected : ''}`}
              onClick={() => setSelected(c)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className={styles.caseCardTop}>
                <SeverityBadge severity={c.severity} size="sm" />
                <span className={styles.caseTime}>
                  {new Date(c.started_at).toLocaleTimeString()}
                </span>
              </div>
              <p className={styles.caseCategory}>
                {c.category || 'Unknown injury'}
              </p>
              {c.location && (
                <p className={styles.caseLocation}>
                  📍 {c.location.lat?.toFixed(4)}, {c.location.lng?.toFixed(4)}
                </p>
              )}
              <div className={styles.caseFooter}>
                <span className={styles.caseSteps}>
                  {c.guidance_steps?.length || 0} steps
                </span>
                <span className={`${styles.caseStatus} ${c.responder_alerted ? styles.alerted : ''}`}>
                  {c.responder_alerted ? '✓ Alerted' : 'Pending'}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className={styles.detail}>
        {!selected ? (
          <div className={styles.detailEmpty}>
            <p>Select a case to view details</p>
          </div>
        ) : (
          <CaseDetail
            caseData={selected}
            onAlert={() => {
              addToast({ type: 'success', message: 'Responder alerted.' })
              setCases((prev) =>
                prev.map((c) =>
                  c.id === selected.id ? { ...c, responder_alerted: true } : c
                )
              )
              setSelected({ ...selected, responder_alerted: true })
            }}
          />
        )}
      </div>

    </div>
  )
}

// ─── Case Detail Panel ────────────────────────────────────────────────────────

function CaseDetail({ caseData, onAlert }) {
  const alertResponder = async () => {
    try {
      await client.post('/api/responder/alert', { case_id: caseData.id })
      onAlert()
    } catch {
      // handled by parent toast
    }
  }

  return (
    <motion.div
      className={styles.detailContent}
      key={caseData.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Case header */}
      <div className={styles.detailHeader}>
        <div>
          <SeverityBadge severity={caseData.severity} />
          <h2 className={styles.detailTitle}>
            {caseData.category || 'Unknown injury'}
          </h2>
          <p className={styles.detailMeta}>
            Case ID: <code>{caseData.id.slice(0, 8)}…</code> ·{' '}
            Started {new Date(caseData.started_at).toLocaleString()}
          </p>
        </div>
        {!caseData.responder_alerted && (
          <button className={styles.alertBtn} onClick={alertResponder}>
            📞 Alert Responder
          </button>
        )}
      </div>

      {/* Live chat with bystander */}
      <ChatPanel caseId={caseData.id} role="doctor" />

      {/* Location */}
      {caseData.location && (
        <div className={styles.detailSection}>
          <h3 className={styles.sectionLabel}>Location</h3>
          <p className={styles.sectionContent}>
            Lat: {caseData.location.lat?.toFixed(6)}<br />
            Lng: {caseData.location.lng?.toFixed(6)}
          </p>
          <a
            href={`https://maps.google.com/?q=${caseData.location.lat},${caseData.location.lng}`}
            target="_blank"
            rel="noreferrer"
            className={styles.mapLink}
          >
            Open in Maps →
          </a>
        </div>
      )}

      {/* Transcript */}
      {caseData.transcripts?.length > 0 && (
        <div className={styles.detailSection}>
          <h3 className={styles.sectionLabel}>Conversation</h3>
          <div className={styles.transcript}>
            {caseData.transcripts.map((entry, i) => (
              <div
                key={i}
                className={`${styles.transcriptEntry} ${styles[entry.role]}`}
              >
                <span className={styles.entryRole}>{entry.role}</span>
                <p className={styles.entryText}>{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guidance steps */}
      {caseData.guidance_steps?.length > 0 && (
        <div className={styles.detailSection}>
          <h3 className={styles.sectionLabel}>Guidance delivered</h3>
          <ol className={styles.stepsList}>
            {caseData.guidance_steps.map((step, i) => (
              <li key={i} className={`${styles.stepsItem} ${step.is_critical ? styles.criticalStep : ''}`}>
                {step.instruction}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Images */}
      {caseData.images?.filter((img) => img.storage_url).length > 0 && (
        <div className={styles.detailSection}>
          <h3 className={styles.sectionLabel}>Images</h3>
          <div className={styles.imageGrid}>
            {caseData.images
              .filter((img) => img.storage_url)
              .map((img, i) => (
                <a key={i} href={img.storage_url} target="_blank" rel="noreferrer">
                  <img
                    src={img.storage_url}
                    alt={`Case image ${i + 1}`}
                    className={styles.caseImage}
                  />
                </a>
              ))
            }
          </div>
        </div>
      )}
    </motion.div>
  )
}
