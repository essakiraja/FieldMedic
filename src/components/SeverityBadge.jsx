/**
 * SeverityBadge — color-coded severity indicator.
 */
import styles from './SeverityBadge.module.css'

const LABELS = {
  critical: '⬤ Critical',
  serious:  '⬤ Serious',
  moderate: '⬤ Moderate',
  minor:    '⬤ Minor',
  unknown:  '⬤ Assessing',
}

export default function SeverityBadge({ severity = 'unknown', size = 'md' }) {
  return (
    <span className={`${styles.badge} ${styles[severity]} ${styles[size]}`}>
      {LABELS[severity] || LABELS.unknown}
    </span>
  )
}
