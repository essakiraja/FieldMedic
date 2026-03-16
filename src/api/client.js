/**
 * FieldMedic — API Client
 *
 * Centralized HTTP client with:
 * - Automatic retry on network failure
 * - Offline detection and queue
 * - Request/response logging in dev
 * - Typed error handling
 */

import axios from 'axios'
import { ENV, ENDPOINTS } from '@/config'

// ─── Client Instance ───────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'fieldmedic-pwa',
  },
})

// ─── Request Interceptor ───────────────────────────────────────────────────────

client.interceptors.request.use(
  (config) => {
    // Attach request timestamp for latency tracking
    config.metadata = { startTime: Date.now() }

    if (ENV.IS_DEVELOPMENT) {
      console.debug(`[API] → ${config.method?.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ──────────────────────────────────────────────────────

client.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata?.startTime
    if (ENV.IS_DEVELOPMENT) {
      console.debug(`[API] ← ${response.status} ${response.config.url} (${duration}ms)`)
    }
    return response
  },
  async (error) => {
    const config = error.config

    // Retry logic: up to 2 retries on network errors or 5xx
    if (!config._retryCount) config._retryCount = 0

    const shouldRetry =
      config._retryCount < 2 &&
      (!error.response || error.response.status >= 500)

    if (shouldRetry) {
      config._retryCount += 1
      const delay = config._retryCount * 1000
      await new Promise((r) => setTimeout(r, delay))
      return client(config)
    }

    return Promise.reject(normalizeError(error))
  }
)

// ─── Error Normalizer ──────────────────────────────────────────────────────────

function normalizeError(error) {
  if (!error.response) {
    return {
      type: 'NETWORK_ERROR',
      message: 'No network connection. Using offline mode.',
      offline: true,
    }
  }

  const { status, data } = error.response
  return {
    type: 'API_ERROR',
    status,
    message: data?.detail || data?.message || 'An unexpected error occurred.',
    offline: false,
  }
}

// ─── API Methods ───────────────────────────────────────────────────────────────

/**
 * Submit wound/scene image for AI triage analysis.
 * @param {string} imageBase64 - Base64-encoded JPEG image
 * @param {object} context - { language, urgency, summary }
 */
export async function analyzeTriage(imageBase64, context = {}) {
  const { data } = await client.post(ENDPOINTS.TRIAGE, {
    image: imageBase64,
    context,
  })
  return data
}

/**
 * Get step-by-step guidance for a given triage result.
 * @param {object} triageResult - Result from analyzeTriage
 * @param {string} language - BCP-47 language code (e.g. 'en', 'sw', 'de')
 */
export async function getGuidance(triageResult, language = 'en') {
  const { data } = await client.post(ENDPOINTS.GUIDANCE, {
    triage: triageResult,
    language,
  })
  return data
}

/**
 * Create or update a case in Firestore.
 * @param {object} sessionData - Current session object from store
 */
export async function syncCase(sessionData) {
  // Remap camelCase store keys to snake_case for the backend
  const session = {
    id:                sessionData.id,
    started_at:        sessionData.startedAt || sessionData.started_at || new Date().toISOString(),
    status:            sessionData.status || 'active',
    location:          sessionData.location || null,
    severity:          sessionData.severity || 'unknown',
    category:          sessionData.category || null,
    images:            (sessionData.images || []).map((img) => ({
      base64:      img.base64 || null,
      captured_at: img.capturedAt || img.captured_at || '',
      storage_url: img.storageUrl || img.storage_url || null,
    })),
    transcripts:       (sessionData.transcripts || []).map((t) => ({
      role: t.role,
      text: t.text,
      ts:   t.ts || 0,
    })),
    guidance_steps:    (sessionData.guidanceSteps || sessionData.guidance_steps || []).map((s) => ({
      index:       s.index,
      instruction: s.instruction,
      is_critical: s.is_critical || s.isCritical || false,
    })),
    responder_alerted: sessionData.responderAlerted || sessionData.responder_alerted || false,
  }

  const { data } = await client.post(ENDPOINTS.CASE, { session })
  return data
}

/**
 * Alert a remote medical responder with case summary.
 * @param {string} caseId - Firestore case ID
 */
export async function alertResponder(caseId) {
  const { data } = await client.post(`${ENDPOINTS.RESPONDER}/alert`, { case_id: caseId })
  return data
}

/**
 * Health check — used to determine connection quality.
 */
export async function healthCheck() {
  const start = Date.now()
  await client.get(ENDPOINTS.HEALTH)
  return Date.now() - start // returns latency in ms
}

export default client
