/**
 * FieldMedic — QR Code Case Share
 *
 * QR encodes a real URL: <APP_URL>/case/<caseId>
 * When scanned, opens the CasePage showing full history.
 */

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ENV } from '@/config'
import styles from './QRShare.module.css'

export default function QRShare({ caseId, severity }) {
  const canvasRef           = useRef(null)
  const [loaded, setLoaded]  = useState(false)
  const [error, setError]    = useState(false)
  const [copied, setCopied]  = useState(false)

  // Full URL that opens the case detail page
  const caseUrl = `${ENV.APP_URL}/case/${caseId}`

  useEffect(() => {
    if (!canvasRef.current || !caseId) return

    QRCode.toCanvas(
      canvasRef.current,
      caseUrl,
      {
        width: 200,
        margin: 2,
        color: { dark: '#e8f0ea', light: '#0e1510' },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) { setError(true); return }
        setLoaded(true)
      }
    )
  }, [caseId, caseUrl])

  const handleCopy = () => {
    navigator.clipboard.writeText(caseUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>⊡</span>
        <div>
          <p className={styles.title}>Show to paramedics</p>
          <p className={styles.sub}>Scan to view full case history</p>
        </div>
        <span className={`${styles.severityDot} ${styles[severity]}`} />
      </div>

      <div className={styles.qrWrapper}>
        {!loaded && !error && <div className={styles.qrPlaceholder}><div className={styles.spinner} /></div>}
        {error && <div className={styles.qrPlaceholder}><p className={styles.errorText}>QR unavailable</p></div>}
        <canvas ref={canvasRef} className={`${styles.qrCanvas} ${loaded ? styles.visible : ''}`} />
      </div>

      <div className={styles.caseId}>
        <span className={styles.caseIdLabel}>Case ID</span>
        <span className={styles.caseIdValue}>{caseId?.slice(0, 8).toUpperCase()}</span>
      </div>

      <button className={styles.copyBtn} onClick={handleCopy}>
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
    </div>
  )
}
