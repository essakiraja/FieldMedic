/**
 * ProgressTrack — horizontal step progress bar with dots.
 */
import styles from './ProgressTrack.module.css'

export default function ProgressTrack({ total, current, steps = [] }) {
  const pct = total > 1 ? (current / (total - 1)) * 100 : 100

  return (
    <div className={styles.wrapper}>
      {/* Fill bar */}
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>

      {/* Step dots */}
      <div className={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`
              ${styles.dot}
              ${i < current  ? styles.done    : ''}
              ${i === current ? styles.active  : ''}
              ${steps[i]?.is_critical ? styles.critical : ''}
            `}
            title={`Step ${i + 1}`}
          />
        ))}
      </div>

      {/* Fraction label */}
      <p className={styles.label}>{current + 1} of {total} steps</p>
    </div>
  )
}
