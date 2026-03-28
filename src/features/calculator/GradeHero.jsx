import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion'
import { getGradeTheme } from '../../utils/gradeCalc'
import { FONT_SANS, FONT_MONO } from './tokens'

// ─── Grade Hero ───────────────────────────────────────────────────────────────
// compact=true → short horizontal strip for mobile
// compact=false (default) → tall card filling its grid cell
//
// Layer stack (bottom → top):
//   1. Ambient gradient   — inset: 0, breathes on 16 s loop, NO cursor response
//   2. Cursor spotlight   — large soft circle, left/top track cursor via springs
//   3. Orb 1              — top-left area, left/top follow cursor, scale breathes
//   4. Orb 2              — bottom-right area, right/bottom follow inversely
//   5. Content            — z-index: 10, never moves
export default function GradeHero({ letter, grade, compact = false }) {
  const theme = getGradeTheme(grade)

  // ── Mouse tracking: 0–1, 0.5 = centre ──────────────────────────────────────
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const springCfg = { damping: 25, stiffness: 150 }
  const smoothX = useSpring(mouseX, springCfg)
  const smoothY = useSpring(mouseY, springCfg)

  // Orb 1 — follows cursor (drifts from top-left corner area)
  const orb1Left = useTransform(smoothX, [0, 1], ['-5%',  '25%'])
  const orb1Top  = useTransform(smoothY, [0, 1], ['-15%', '15%'])

  // Orb 2 — moves opposite (anchored to bottom-right corner area)
  const orb2Right  = useTransform(smoothX, [0, 1], ['15%', '-10%'])
  const orb2Bottom = useTransform(smoothY, [0, 1], ['10%', '-15%'])

  // Spotlight — centred on cursor via translate(-50%,-50%) + left/top
  const spotLeft = useTransform(smoothX, [0, 1], ['-20%', '80%'])
  const spotTop  = useTransform(smoothY, [0, 1], ['-20%', '80%'])

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top)  / rect.height)
  }

  function handleMouseLeave() {
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  // ── Background layers (shared by compact + desktop) ─────────────────────────
  const AnimatedBackground = (
    <>
      {/* Layer 1: ambient gradient — pinned, no cursor response */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, ${theme.primary}33 0%, transparent 35%),
            radial-gradient(circle at 80% 20%, ${theme.accent}2b   0%, transparent 30%),
            radial-gradient(circle at 70% 75%, ${theme.secondary}30 0%, transparent 38%),
            linear-gradient(135deg, #06101f 0%, #0a1830 45%, #0b1324 100%)
          `,
          backgroundSize: '140% 140%',
          pointerEvents: 'none',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 20%', '80% 100%', '0% 0%'],
          scale: [1, 1.03, 1.01, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Layer 2: cursor spotlight — centred on cursor via translate(-50%,-50%) */}
      <motion.div
        style={{
          position: 'absolute',
          width: 500, height: 500,
          borderRadius: '50%',
          filter: 'blur(100px)',
          opacity: 0.15,
          background: `radial-gradient(circle, ${theme.accent}, transparent 70%)`,
          left: spotLeft,
          top: spotTop,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3: orb 1 — top-left, left/top driven by cursor */}
      <motion.div
        style={{
          position: 'absolute',
          width: 320, height: 320,
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.35,
          background: `radial-gradient(circle, ${theme.primary}, transparent 70%)`,
          left: orb1Left,
          top: orb1Top,
          pointerEvents: 'none',
        }}
        animate={{ scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Layer 4: orb 2 — bottom-right, right/bottom move opposite to cursor */}
      <motion.div
        style={{
          position: 'absolute',
          width: 280, height: 280,
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.28,
          background: `radial-gradient(circle, ${theme.secondary}, transparent 70%)`,
          right: orb2Right,
          bottom: orb2Bottom,
          pointerEvents: 'none',
        }}
        animate={{ scale: [1, 0.9, 1.05, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  )

  if (compact) {
    return (
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          borderRadius: 14,
          background: '#070b1a',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 140,
        }}
      >
        {AnimatedBackground}
        <p style={{ position: 'relative', zIndex: 10, color: 'rgba(255,255,255,0.6)', fontFamily: FONT_SANS, fontWeight: 900, fontSize: 9, letterSpacing: '0.16em', margin: 0 }}>
          PROJECTED GRADE
        </p>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#fff', fontFamily: FONT_MONO, fontWeight: 900, fontSize: 52, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {letter}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 22 }}>
            {grade}%
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        height: '100%',
        borderRadius: 14,
        background: '#070b1a',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {AnimatedBackground}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <p style={{ color: 'rgba(255,255,255,0.95)', fontFamily: FONT_SANS, fontWeight: 900, fontSize: 10, letterSpacing: '0.16em', margin: 0 }}>
          PROJECTED GRADE
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONT_SANS, fontWeight: 600, fontSize: 9, letterSpacing: '0.1em', margin: '4px 0 0' }}>
          REAL-TIME CALCULATIONS BASED ON SYLLABUS WEIGHTS
        </p>
      </div>
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ color: '#ffffff', fontFamily: FONT_MONO, fontWeight: 900, fontSize: 'clamp(56px, 7vw, 96px)', lineHeight: 1, letterSpacing: '-0.02em', marginLeft: '-0.05em' }}>
          {letter}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 22, marginTop: 6 }}>
          {grade}%
        </div>
      </div>
    </div>
  )
}
