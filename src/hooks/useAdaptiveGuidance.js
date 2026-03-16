/**
 * FieldMedic — useAdaptiveGuidance Hook
 *
 * After key steps, asks the bystander a check-in question.
 * Based on the answer, fetches updated guidance from the backend.
 * Continues from the NEXT step after answering — never resets to step 1.
 */

import { useState, useCallback, useRef } from 'react'
import { getGuidance } from '@/api/client'
import { useLanguageDetection } from '@/hooks/useLanguageDetection'

// Steps after which we ask a check-in (by injury category)
const CHECKIN_TRIGGERS = {
  bleeding:  { afterStep: 3, question: 'Is the bleeding slowing down?' },
  burns:     { afterStep: 1, question: 'Has the person been removed from the heat source?' },
  cardiac:   { afterStep: 2, question: 'Is the person showing any signs of life?' },
  fracture:  { afterStep: 2, question: 'Is the person in severe pain or showing signs of shock?' },
  choking:   { afterStep: 1, question: 'Can the person speak or cough at all?' },
  shock:     { afterStep: 2, question: 'Is the person still conscious and breathing?' },
}

export function useAdaptiveGuidance({ triage, onNewSteps, onAdvance }) {
  const [checkIn, setCheckIn]       = useState(null)
  const [isAdapting, setIsAdapting] = useState(false)

  // Track which step indices have already fired — prevents re-triggering
  const firedRef = useRef(new Set())

  const { voiceLanguage, speakInLanguage } = useLanguageDetection()

  // Call this on every step advance — returns true if check-in was triggered
  const checkForTrigger = useCallback((stepIndex, category) => {
    const trigger = CHECKIN_TRIGGERS[category?.toLowerCase()]
    if (!trigger) return false

    // Only fire once per step index per session
    if (stepIndex !== trigger.afterStep) return false
    if (firedRef.current.has(stepIndex)) return false

    firedRef.current.add(stepIndex)
    setCheckIn({ question: trigger.question, stepIndex })
    speakInLanguage(trigger.question)
    return true
  }, [speakInLanguage])

  const handleCheckInAnswer = useCallback(async (answer) => {
    if (!triage) {
      // No triage context — just advance past the trigger step
      setCheckIn(null)
      onAdvance?.()
      return
    }

    const capturedCheckIn = checkIn
    setCheckIn(null)
    setIsAdapting(true)

    try {
      const adaptedTriage = {
        ...triage,
        observation: `${triage.observation} Check-in: "${capturedCheckIn?.question}" — Answer: "${answer}". Adapt the REMAINING steps from here.`,
      }

      const response = await getGuidance(adaptedTriage, voiceLanguage)

      if (response?.steps?.length > 0) {
        // Pass new steps AND signal to continue from next step, not reset to 0
        onNewSteps?.(response.steps, { continueFrom: capturedCheckIn?.stepIndex + 1 })
      } else {
        // API returned nothing — just advance
        onAdvance?.()
      }
    } catch (err) {
      console.warn('[AdaptiveGuidance] Failed to adapt:', err)
      onAdvance?.() // always unblock on error
    } finally {
      setIsAdapting(false)
    }
  }, [triage, checkIn, voiceLanguage, onNewSteps, onAdvance])

  const dismissCheckIn = useCallback(() => {
    setCheckIn(null)
    onAdvance?.() // dismiss = skip check-in and continue
  }, [onAdvance])

  const resetTriggers = useCallback(() => {
    firedRef.current = new Set()
  }, [])

  return {
    checkIn,
    isAdapting,
    checkForTrigger,
    handleCheckInAnswer,
    dismissCheckIn,
    resetTriggers,
  }
}
