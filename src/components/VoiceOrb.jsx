/**
 * VoiceOrb — Animated voice interaction button.
 * Pulses when listening, glows when speaking.
 */

import { motion } from 'framer-motion'
import styles from './VoiceOrb.module.css'

export default function VoiceOrb({ isListening, isSpeaking, onToggle, size = 120 }) {
  return (
    <div className={styles.wrapper} style={{ '--size': `${size}px` }}>

      {/* Outer pulse rings — only visible when listening */}
      {isListening && (
        <>
          <motion.div
            className={styles.ring}
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className={styles.ring}
            animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
          />
        </>
      )}

      {/* Speaking wave rings */}
      {isSpeaking && (
        <motion.div
          className={styles.speakRing}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Core orb */}
      <motion.button
        className={`${styles.orb} ${isListening ? styles.orbListening : ''} ${isSpeaking ? styles.orbSpeaking : ''}`}
        onClick={onToggle}
        whileTap={{ scale: 0.93 }}
        animate={isListening ? { boxShadow: ['0 0 0px rgba(61,220,132,0.4)', '0 0 32px rgba(61,220,132,0.6)', '0 0 0px rgba(61,220,132,0.4)'] } : {}}
        transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}
      >
        <span className={styles.icon}>
          {isListening ? '🎙' : isSpeaking ? '🔊' : '🎙'}
        </span>
      </motion.button>

      {/* Label */}
      <p className={styles.label}>
        {isListening ? 'Listening…' : isSpeaking ? 'Speaking…' : 'Tap to speak'}
      </p>
    </div>
  )
}
