/**
 * FieldMedic — ChatPanel
 *
 * Two-way real-time chat between bystander and remote doctor.
 * Used in GuidancePage (bystander) and ResponderPage (doctor).
 *
 * Props:
 *   caseId    — Firestore case ID
 *   role      — 'bystander' | 'doctor'
 *   compact   — true = collapsed sidebar style, false = full panel
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import styles from './ChatPanel.module.css'

export default function ChatPanel({ caseId, role = 'bystander', compact = false }) {
  const [input, setInput]     = useState('')
  const [open, setOpen]       = useState(!compact)
  const messagesEndRef        = useRef(null)

  const { messages, sending, error, sendMessage } = useChat({
    caseId,
    role,
    enabled: !!caseId,
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || sending) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const unreadDoctorMsgs = messages.filter((m) => m.role === 'doctor').length

  if (!caseId) return null

  return (
    <div className={`${styles.wrapper} ${compact ? styles.compact : ''}`}>

      {/* Compact header — toggle button */}
      {compact && (
        <button className={styles.toggleBtn} onClick={() => setOpen((o) => !o)}>
          <span className={styles.toggleIcon}>💬</span>
          <span className={styles.toggleLabel}>
            {role === 'bystander' ? 'Doctor messages' : 'Chat with bystander'}
          </span>
          {unreadDoctorMsgs > 0 && role === 'bystander' && (
            <span className={styles.badge}>{unreadDoctorMsgs}</span>
          )}
          <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Panel header */}
            {!compact && (
              <div className={styles.header}>
                <span className={styles.headerTitle}>
                  {role === 'doctor' ? 'Bystander chat' : 'Remote doctor'}
                </span>
                <span className={styles.liveDot} />
                <span className={styles.liveLabel}>Live</span>
              </div>
            )}

            {/* Messages */}
            <div className={styles.messages}>
              {messages.length === 0 && (
                <p className={styles.empty}>
                  {role === 'doctor'
                    ? 'No messages yet. Type below to guide the bystander.'
                    : 'Waiting for a doctor to connect…'}
                </p>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id || i}
                  className={`${styles.bubble} ${styles[msg.role]} ${msg.optimistic ? styles.optimistic : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className={styles.bubbleRole}>
                    {msg.role === 'doctor' ? '🩺 Doctor' : '🙋 Bystander'}
                  </span>
                  <p className={styles.bubbleText}>{msg.text}</p>
                  <span className={styles.bubbleTs}>
                    {msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </motion.div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && <p className={styles.error}>{error}</p>}

            {/* Input */}
            <div className={styles.inputRow}>
              <textarea
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  role === 'doctor'
                    ? 'Type instructions — spoken to bystander…'
                    : 'Reply to doctor…'
                }
                rows={2}
                disabled={sending}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                {sending ? '…' : '↑'}
              </button>
            </div>

            {role === 'doctor' && (
              <p className={styles.hint}>
                Your message will be spoken aloud on the bystander's device.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
