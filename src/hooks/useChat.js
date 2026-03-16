/**
 * FieldMedic — useChat Hook
 *
 * Real-time two-way messaging between bystander and remote doctor.
 * Uses polling against the REST API (Firestore onSnapshot would require
 * the Firebase JS SDK — this is lighter and works with our existing setup).
 *
 * Doctor messages are automatically spoken aloud via TTS.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import client from '@/api/client'
import { useLanguageDetection } from '@/hooks/useLanguageDetection'

const POLL_INTERVAL_MS = 3000  // Check for new messages every 3 seconds

export function useChat({ caseId, role = 'bystander', enabled = true }) {
  const [messages, setMessages]   = useState([])
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState(null)
  const lastTsRef                 = useRef(null)
  const pollRef                   = useRef(null)
  const { speakInLanguage, voiceLanguage } = useLanguageDetection()

  // ─── Load initial messages ──────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    if (!caseId || !enabled) return
    try {
      const { data } = await client.get(`/api/chat/${caseId}/messages`)
      const msgs = data.messages || []
      setMessages(msgs)
      if (msgs.length > 0) {
        lastTsRef.current = msgs[msgs.length - 1].ts
      }
    } catch (e) {
      // Silent fail — chat is additive, not critical
    }
  }, [caseId, enabled])

  // ─── Poll for new messages ──────────────────────────────────────────────

  const pollNewMessages = useCallback(async () => {
    if (!caseId || !enabled) return
    try {
      const { data } = await client.get(`/api/chat/${caseId}/messages`)
      const allMsgs = data.messages || []

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id || m.ts))
        const newMsgs = allMsgs.filter((m) => !existingIds.has(m.id || m.ts))

        if (newMsgs.length === 0) return prev

        // Speak new doctor messages aloud (bystander role only)
        if (role === 'bystander') {
          newMsgs
            .filter((m) => m.role === 'doctor')
            .forEach((m) => {
              speakInLanguage(`Message from doctor: ${m.text}`, voiceLanguage)
            })
        }

        return [...prev, ...newMsgs]
      })
    } catch (e) {
      // Silent — polling will retry
    }
  }, [caseId, enabled, role, speakInLanguage, voiceLanguage])

  // ─── Start / stop polling ───────────────────────────────────────────────

  useEffect(() => {
    if (!caseId || !enabled) return

    loadMessages()
    pollRef.current = setInterval(pollNewMessages, POLL_INTERVAL_MS)

    return () => {
      clearInterval(pollRef.current)
    }
  }, [caseId, enabled])

  // ─── Send message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !caseId) return
    setSending(true)
    setError(null)

    // Optimistic add — show immediately before server confirms
    const optimistic = {
      id:   `local-${Date.now()}`,
      role,
      text: text.trim(),
      ts:   new Date().toISOString(),
      optimistic: true,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await client.post('/api/chat/message', {
        case_id:   caseId,
        role,
        text:      text.trim(),
        spoken:    role === 'doctor',
      })
    } catch (e) {
      setError('Message failed to send.')
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }, [caseId, role])

  return {
    messages,
    sending,
    error,
    sendMessage,
  }
}
