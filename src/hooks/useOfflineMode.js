/**
 * FieldMedic — useOfflineMode Hook
 *
 * Monitors network connectivity and provides the offline decision tree
 * as a fallback when Gemini API is unreachable.
 */

import { useEffect, useCallback } from 'react'
import { OFFLINE_SCENARIOS } from '@/config'
import { useStore } from '@/store'
import { healthCheck } from '@/api/client'

export function useOfflineMode() {
  const setOnline = useStore((s) => s.setOnline)
  const setConnectionQuality = useStore((s) => s.setConnectionQuality)
  const isOnline = useStore((s) => s.isOnline)
  const connectionQuality = useStore((s) => s.connectionQuality)

  // ─── Listen to browser online/offline events ──────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      probeConnection()
    }
    const handleOffline = () => {
      setOnline(false)
      setConnectionQuality('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial probe
    probeConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ─── Active connection quality probe ─────────────────────────────────────

  const probeConnection = useCallback(async () => {
    try {
      const latencyMs = await healthCheck()
      if (latencyMs < 500) setConnectionQuality('good')
      else if (latencyMs < 2000) setConnectionQuality('poor')
      else setConnectionQuality('offline')
    } catch {
      setConnectionQuality('offline')
      setOnline(false)
    }
  }, [setOnline, setConnectionQuality])

  // ─── Get offline guidance for a given category ────────────────────────────

  const getOfflineGuidance = useCallback((category) => {
    const scenario = OFFLINE_SCENARIOS[category] || OFFLINE_SCENARIOS.bleeding
    return {
      steps: scenario.steps,
      label: scenario.label,
      isOfflineFallback: true,
    }
  }, [])

  // ─── Detect best available category from user description ────────────────

  const detectOfflineCategory = useCallback((userText = '') => {
    const text = userText.toLowerCase()
    const keywords = {
      bleeding: ['bleed', 'blood', 'cut', 'wound', 'lacerat', 'gash'],
      burns: ['burn', 'fire', 'scald', 'hot', 'flame'],
      choking: ['chok', 'breath', 'airway', 'swallow', 'throat'],
      fracture: ['fracture', 'bone', 'break', 'broke', 'snap'],
      cardiac: ['heart', 'chest', 'unconscious', 'collapse', 'cpr', 'pulse'],
      shock: ['shock', 'pale', 'faint', 'dizzy', 'weak'],
    }

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some((w) => text.includes(w))) return category
    }

    return 'bleeding' // safest default
  }, [])

  return {
    isOnline,
    connectionQuality,
    probeConnection,
    getOfflineGuidance,
    detectOfflineCategory,
    offlineScenarios: OFFLINE_SCENARIOS,
  }
}
