/**
 * ToastStack — global notification toasts.
 * Auto-dismisses after duration. Stacks from bottom-right.
 */
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToasts, useStore } from '@/store'
import styles from './ToastStack.module.css'

export default function ToastStack() {
  const toasts     = useToasts()
  const removeToast = useStore((s) => s.removeToast)

  return (
    <div className={styles.stack}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, toast.duration || 4000)
    return () => clearTimeout(t)
  }, [])

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'i' }

  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type || 'info']}`}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <span className={styles.icon}>{icons[toast.type] || 'i'}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={onDismiss}>✕</button>
    </motion.div>
  )
}
