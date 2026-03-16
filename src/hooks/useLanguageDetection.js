/**
 * FieldMedic — useLanguageDetection Hook
 *
 * Detects the user's language from:
 *   1. Browser/device language setting (navigator.language)
 *   2. Intake agent response after user speaks/types
 *
 * Syncs detected language to the store so:
 *   - TTS speaks in the right language
 *   - Guidance agent responds in the right language
 *   - Browser speechSynthesis uses the right voice
 */

import { useCallback, useEffect } from 'react'
import { useStore } from '@/store'

// Languages supported by both Gemini and browser SpeechSynthesis
const SUPPORTED_LANGS = new Set([
  'en', 'sw', 'de', 'fr', 'ar', 'hi', 'es',
  'pt', 'zh', 'ja', 'ko', 'ru', 'tr', 'nl',
  'pl', 'it', 'ta', 'te', 'bn', 'ur',
])

// Map full BCP-47 tags to short codes (e.g. 'en-US' → 'en')
function normalizeLang(tag = '') {
  const base = tag.split('-')[0].toLowerCase()
  return SUPPORTED_LANGS.has(base) ? base : 'en'
}

export function useLanguageDetection() {
  const voiceLanguage   = useStore((s) => s.voiceLanguage)
  const setVoiceLanguage = useStore((s) => s.setVoiceLanguage)

  // On mount — detect from browser settings
  useEffect(() => {
    const browserLang = normalizeLang(navigator.language)
    if (browserLang !== 'en') {
      setVoiceLanguage(browserLang)
    }
  }, [])

  // Called after intake agent responds — update language from AI detection
  const updateFromIntake = useCallback((detectedLang) => {
    if (!detectedLang) return
    const normalized = normalizeLang(detectedLang)
    if (normalized !== voiceLanguage) {
      setVoiceLanguage(normalized)
    }
  }, [voiceLanguage, setVoiceLanguage])

  // Get the full BCP-47 tag for SpeechSynthesis (e.g. 'ar' → 'ar-XA')
  const getSpeechLang = useCallback((lang = voiceLanguage) => {
    const map = {
      en: 'en-US', sw: 'sw-KE', de: 'de-DE', fr: 'fr-FR',
      ar: 'ar-XA', hi: 'hi-IN', es: 'es-ES', pt: 'pt-BR',
      zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ru: 'ru-RU',
      tr: 'tr-TR', nl: 'nl-NL', pl: 'pl-PL', it: 'it-IT',
    }
    return map[lang] || 'en-US'
  }, [voiceLanguage])

  // Speak text using browser SpeechSynthesis in the detected language
  const speakInLanguage = useCallback((text, lang = voiceLanguage) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang  = getSpeechLang(lang)
    utterance.rate  = 0.9
    utterance.pitch = 0.95

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices()
    const match  = voices.find((v) =>
      v.lang.startsWith(lang) || v.lang.startsWith(getSpeechLang(lang))
    )
    if (match) utterance.voice = match

    window.speechSynthesis.speak(utterance)
  }, [voiceLanguage, getSpeechLang])

  return {
    voiceLanguage,
    setVoiceLanguage,
    updateFromIntake,
    getSpeechLang,
    speakInLanguage,
  }
}
