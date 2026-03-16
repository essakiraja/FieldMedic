/**
 * FieldMedic — Global State Store (Zustand)
 *
 * Single source of truth. Split into named slices for clarity.
 * Each slice owns its state and its actions.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TRIAGE } from '@/config'

// ─── Session Slice ─────────────────────────────────────────────────────────────

const createSessionSlice = (set, get) => ({
  // Current active emergency session
  session: null,

  startSession: (locationData = null) => {
    const session = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      status: 'active',
      location: locationData,
      severity: TRIAGE.SEVERITY.UNKNOWN,
      category: null,
      images: [],
      transcripts: [],
      guidanceSteps: [],
      responderAlerted: false,
    }
    set({ session })
    return session
  },

  updateSession: (updates) =>
    set((state) => ({
      session: state.session ? { ...state.session, ...updates } : null,
    })),

  addImage: (imageData) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, images: [...state.session.images, imageData] }
        : null,
    })),

  addTranscript: (entry) =>
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            transcripts: [...state.session.transcripts, { ...entry, ts: Date.now() }],
          }
        : null,
    })),

  endSession: () => set({ session: null }),
})

// ─── Connectivity Slice ────────────────────────────────────────────────────────

const createConnectivitySlice = (set) => ({
  isOnline: navigator.onLine,
  connectionQuality: 'unknown', // 'good' | 'poor' | 'offline'

  setOnline: (status) =>
    set({
      isOnline: status,
      connectionQuality: status ? 'good' : 'offline',
    }),

  setConnectionQuality: (quality) => set({ connectionQuality: quality }),
})

// ─── Triage Slice ──────────────────────────────────────────────────────────────

const createTriageSlice = (set) => ({
  triageResult: null,
  triageLoading: false,
  triageError: null,

  setTriageLoading: (loading) => set({ triageLoading: loading }),

  setTriageResult: (result) =>
    set({ triageResult: result, triageLoading: false, triageError: null }),

  setTriageError: (error) =>
    set({ triageError: error, triageLoading: false }),

  clearTriage: () =>
    set({ triageResult: null, triageLoading: false, triageError: null }),
})

// ─── Voice Slice ───────────────────────────────────────────────────────────────

const createVoiceSlice = (set) => ({
  isListening: false,
  isSpeaking: false,
  voiceLanguage: 'en-US',
  liveTranscript: '',

  setListening: (status) => set({ isListening: status }),
  setSpeaking: (status) => set({ isSpeaking: status }),
  setVoiceLanguage: (lang) => set({ voiceLanguage: lang }),
  setLiveTranscript: (text) => set({ liveTranscript: text }),
})

// ─── UI Slice ──────────────────────────────────────────────────────────────────

const createUISlice = (set) => ({
  activeView: 'home',          // 'home' | 'triage' | 'guidance' | 'responder'
  toasts: [],
  cameraPermission: null,       // null | 'granted' | 'denied'
  micPermission: null,

  setActiveView: (view) => set({ activeView: view }),

  setCameraPermission: (status) => set({ cameraPermission: status }),
  setMicPermission: (status) => set({ micPermission: status }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), duration: 4000, ...toast },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
})

// ─── Root Store ────────────────────────────────────────────────────────────────

export const useStore = create(
  persist(
    (set, get) => ({
      ...createSessionSlice(set, get),
      ...createConnectivitySlice(set),
      ...createTriageSlice(set),
      ...createVoiceSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'fieldmedic-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist session data — not transient UI state
      partialize: (state) => ({
        session: state.session,
        voiceLanguage: state.voiceLanguage,
      }),
    }
  )
)

// ─── Typed Selectors (for clean component imports) ──────────────────────────────

export const useSession = () => useStore((s) => s.session)
export const useIsOnline = () => useStore((s) => s.isOnline)
export const useConnectionQuality = () => useStore((s) => s.connectionQuality)
export const useTriageResult = () => useStore((s) => s.triageResult)
export const useVoiceState = () =>
  useStore((s) => ({
    isListening: s.isListening,
    isSpeaking: s.isSpeaking,
    liveTranscript: s.liveTranscript,
    voiceLanguage: s.voiceLanguage,
  }))
export const useToasts = () => useStore((s) => s.toasts)
