/**
 * FieldMedic — useGeminiLive Hook
 *
 * Manages a real-time bidirectional voice session with Gemini Live API.
 *
 * Key fixes:
 * - URL uses v1beta (not v1alpha)
 * - Model: gemini-2.5-flash-native-audio-preview-12-2025
 * - response_modalities must be AUDIO only (not both AUDIO + TEXT)
 * - Wait for setupComplete before sending audio
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { ENV, AGENT_PROMPTS } from '@/config'
import { useStore } from '@/store'

// v1beta endpoint — v1alpha is deprecated
const GEMINI_LIVE_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${ENV.GEMINI_API_KEY}`

// Current supported Live API model
const LIVE_MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'

export function useGeminiLive({ onMessage, onError, systemPrompt } = {}) {
  const wsRef           = useRef(null)
  const audioContextRef = useRef(null)
  const processorRef    = useRef(null)
  const streamRef       = useRef(null)
  const setupDoneRef    = useRef(false)  // wait for setupComplete before sending audio

  const [isConnected, setIsConnected]   = useState(false)
  const [isListening, setIsListening]   = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [error, setError]               = useState(null)

  const setListening     = useStore((s) => s.setListening)
  const setSpeaking      = useStore((s) => s.setSpeaking)
  const setLiveTranscript = useStore((s) => s.setLiveTranscript)
  const addTranscript    = useStore((s) => s.addTranscript)

  // ─── Connect ─────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setupDoneRef.current = false

    try {
      const ws = new WebSocket(GEMINI_LIVE_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.debug('[GeminiLive] WebSocket opened, sending setup...')

        // IMPORTANT: response_modalities must be ONE modality only
        // Using AUDIO — transcription comes separately via outputAudioTranscription
        ws.send(JSON.stringify({
          setup: {
            model: LIVE_MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt || AGENT_PROMPTS.GUIDANCE }],
            },
          },
        }))
      }

      ws.onmessage = async (event) => {
        try {
          // Gemini Live can send either a string or a Blob — handle both
          const raw = event.data instanceof Blob
            ? await event.data.text()
            : event.data
          const msg = JSON.parse(raw)
          handleIncomingMessage(msg)
        } catch (e) {
          // Ignore binary frames that aren't JSON (e.g. raw audio chunks)
          if (!(event.data instanceof Blob)) {
            console.debug('[GeminiLive] Parse error', e)
          }
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        setIsListening(false)
        setListening(false)
        setupDoneRef.current = false
        console.debug(`[GeminiLive] Closed code=${event.code} reason="${event.reason}"`)

        // Auto-reconnect unless intentional close (1000) or policy violation (1008)
        if (event.code !== 1000 && event.code !== 1008) {
          console.debug('[GeminiLive] Auto-reconnecting in 2s...')
          setTimeout(connect, 2000)
        } else if (event.code === 1008) {
          console.error('[GeminiLive] Policy violation — check model name or API key')
          setError(`Voice unavailable: ${event.reason || 'Policy violation'}`)
        }
      }

      ws.onerror = (err) => {
        console.error('[GeminiLive] WebSocket error', err)
        setError('Voice connection failed.')
        onError?.(err)
      }
    } catch (err) {
      setError('Unable to start voice session.')
      onError?.(err)
    }
  }, [systemPrompt, onError])

  // ─── Handle incoming messages ─────────────────────────────────────────────

  const handleIncomingMessage = useCallback((msg) => {
    // Setup complete — now safe to send audio
    if (msg.setupComplete !== undefined) {
      console.debug('[GeminiLive] Setup complete ✓')
      setupDoneRef.current = true
      setIsConnected(true)
      setError(null)
      return
    }

    if (!msg.serverContent) return

    const content = msg.serverContent

    // Audio output from Gemini
    if (content.modelTurn?.parts) {
      content.modelTurn.parts.forEach((part) => {
        if (part.inlineData?.mimeType?.startsWith('audio')) {
          playAudioChunk(part.inlineData.data)
          setSpeaking(true)
          onMessage?.({ type: 'audio', data: part.inlineData.data })
        }
        if (part.text) {
          setTranscript(part.text)
          setLiveTranscript(part.text)
          addTranscript({ role: 'assistant', text: part.text })
          onMessage?.({ type: 'text', text: part.text })
        }
      })
    }

    // Input transcription (what the user said)
    if (content.inputTranscription?.text) {
      const text = content.inputTranscription.text
      addTranscript({ role: 'user', text })
      onMessage?.({ type: 'transcript', text })
    }

    // Output transcription (what Gemini said)
    if (content.outputTranscription?.text) {
      const text = content.outputTranscription.text
      setTranscript(text)
      setLiveTranscript(text)
    }

    if (content.turnComplete) {
      setSpeaking(false)
    }

    if (content.interrupted) {
      setSpeaking(false)
    }
  }, [onMessage, setSpeaking, setLiveTranscript, addTranscript])

  // ─── Microphone capture ───────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect()
      // Wait for setup to complete before starting audio
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (setupDoneRef.current) { clearInterval(check); resolve() }
        }, 100)
        setTimeout(() => { clearInterval(check); resolve() }, 5000) // timeout
      })
    }

    if (!setupDoneRef.current) {
      setError('Voice session not ready. Please try again.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (!setupDoneRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return

        const pcm    = e.inputBuffer.getChannelData(0)
        const int16  = float32ToInt16(pcm)
        const base64 = arrayBufferToBase64(int16.buffer)

        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64,
            }],
          },
        }))
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      setIsListening(true)
      setListening(true)
      console.debug('[GeminiLive] Microphone started')
    } catch (err) {
      console.error('[GeminiLive] Mic error', err)
      setError('Microphone access denied.')
      onError?.(err)
    }
  }, [connect, onError, setListening])

  // ─── Stop listening ───────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    setIsListening(false)
    setListening(false)
    console.debug('[GeminiLive] Microphone stopped')
  }, [setListening])

  // ─── Send text ────────────────────────────────────────────────────────────

  const sendText = useCallback((text) => {
    if (!setupDoneRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return
    addTranscript({ role: 'user', text })
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }))
  }, [addTranscript])

  // ─── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    stopListening()
    wsRef.current?.close(1000, 'User ended session')
    setIsConnected(false)
    setupDoneRef.current = false
  }, [stopListening])

  useEffect(() => () => disconnect(), [])

  return {
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText,
    isConnected,
    isListening,
    transcript,
    error,
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function float32ToInt16(float32Array) {
  const out = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    out[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7fff
  }
  return out
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

// Persistent audio context for playback — avoids creating new one per chunk
let _playbackCtx = null
function getPlaybackContext() {
  if (!_playbackCtx || _playbackCtx.state === 'closed') {
    const AC = window.AudioContext || window.webkitAudioContext
    _playbackCtx = new AC()
  }
  return _playbackCtx
}

function playAudioChunk(base64Data) {
  try {
    const binary = atob(base64Data)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const ctx = getPlaybackContext()
    ctx.decodeAudioData(bytes.buffer.slice(0), (buffer) => {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      src.start()
    }, (e) => console.debug('[Audio] Decode error', e))
  } catch (e) {
    console.debug('[Audio] Playback error', e)
  }
}
