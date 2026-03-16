import { useStore } from '@/store'
import styles from './ConnectionBadge.module.css'

export default function ConnectionBadge() {
  const quality = useStore((s) => s.connectionQuality)

  const config = {
    good:    { label: 'Online',  dot: 'green'  },
    poor:    { label: 'Weak',    dot: 'amber'  },
    offline: { label: 'Offline', dot: 'red'    },
    unknown: { label: '…',       dot: 'gray'   },
  }[quality] || { label: '…', dot: 'gray' }

  return (
    <span className={`${styles.badge} ${styles[config.dot]}`}>
      <span className={styles.dot} />
      {config.label}
    </span>
  )
}
