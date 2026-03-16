/**
 * ConnectionBar — appears at the very top when offline or connection is poor.
 * Silent when connection is good.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'
import styles from './ConnectionBar.module.css'

export default function ConnectionBar() {
  const quality = useStore((s) => s.connectionQuality)
  const show = quality === 'offline' || quality === 'poor'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`${styles.bar} ${styles[quality]}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {quality === 'offline'
            ? '⚡ No connection — offline guidance active'
            : '⚠ Weak connection — some features may be slower'}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
