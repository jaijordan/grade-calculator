import { motion } from 'framer-motion'
import { buttonHover } from '../../utils/hoverPresets'
import { C, FONT_SANS, FONT_MONO } from './tokens'

// ─── Demo Prompt ──────────────────────────────────────────────────────────────
// Centered modal that appears ~800ms after landing on the demo page.
// Encourages new users to add their own course. Dismissed per-session.
export default function DemoPrompt({ onDismiss, onGetStarted }) {
  return (
    <motion.div
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        backgroundColor: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#131416',
          borderRadius: 20,
          border: `1px solid rgba(255,255,255,0.10)`,
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.80)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Gradient accent bar */}
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${C.blue}, #2dd4a8 60%, transparent 100%)`,
        }} />

        {/* Content */}
        <div style={{ padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>

          {/* Icon badge */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.blue}30, #2dd4a830)`,
            border: `1px solid ${C.blue}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 900, fontSize: 18, color: C.blue }}>A+</span>
          </div>

          {/* Title */}
          <div style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            Stay On Track
          </div>

          {/* Subtitle */}
          <div style={{ color: C.muted, fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.5, maxWidth: 300 }}>
            Wondering what you need on the final to save your grade? Add your course to find out.
          </div>

          {/* CTA */}
          <motion.button
            {...buttonHover}
            onClick={onGetStarted}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '14px 0',
              backgroundColor: C.blue,
              border: 'none',
              borderRadius: 12,
              color: '#000',
              fontFamily: FONT_SANS,
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            GET STARTED
          </motion.button>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.dim,
              fontFamily: FONT_SANS,
              fontSize: 12,
              padding: '4px 0',
            }}
          >
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
