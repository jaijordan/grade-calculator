import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCardSpotlight, CardSpotlight } from '../../components/CardSpotlight'
import { getLetter, gradeColor, colorHex, requiredScore } from '../../utils/gradeCalc'
import { C, CARD_BG, FONT_SANS, FONT_MONO } from './tokens'

// ─── Letter Scale ─────────────────────────────────────────────────────────────
export default function LetterScale({ scale, currentGrade, categories = [], compact = false }) {
  const { spotX, spotY, handleMouseMove, handleMouseLeave } = useCardSpotlight()

  const [view, setView] = useState('scale') // 'scale' | 'required'

  // Required score state
  const currentLetter    = getLetter(currentGrade, scale)
  const currentScaleIdx  = scale.findIndex(s => s.grade === currentLetter)
  const defaultReqTarget = currentScaleIdx > 0 ? scale[currentScaleIdx - 1].grade : scale[0].grade
  const [reqTarget, setReqTarget] = useState(defaultReqTarget)

  const entries = scale.map((entry, idx) => {
    const hi = idx === 0 ? 100 : scale[idx - 1].min - 0.1
    const rangeStr = entry.grade === 'F'
      ? '0 – 59.9'
      : `${entry.min} – ${hi % 1 === 0 ? hi.toFixed(1) : hi}`
    return { ...entry, rangeStr }
  })

  const half  = Math.ceil(entries.length / 2)
  const left  = entries.slice(0, half)
  const right = entries.slice(half)

  const chipScale = scale.filter(s => s.grade !== 'F')

  return (
    <div
      className="card-hoverable"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        height: compact ? 'auto' : '100%',
        borderRadius: 14,
        background: CARD_BG,
        border: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <CardSpotlight spotX={spotX} spotY={spotY} color="rgba(255,255,255,0.04)" />
      <div style={{ position: 'relative', zIndex: 1, flex: compact ? undefined : 1, minHeight: 0, padding: '14px 18px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

        {/* Header with tab switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {['scale', 'required'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: FONT_SANS,
                  fontWeight: 900,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  color: view === v ? C.white : C.dim,
                  padding: '0 6px 0 0',
                  transition: 'color 0.15s',
                }}
              >
                {v === 'scale' ? 'SCALE' : 'REQUIRED'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scale view ── */}
        {view === 'scale' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 0, flex: compact ? undefined : 1, overflow: compact ? undefined : 'hidden' }}>
            {[left, right].map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', justifyContent: compact ? 'flex-start' : 'space-between', gap: compact ? 4 : 0 }}>
                {col.map((entry) => {
                  const active = entry.grade === currentLetter
                  const entryColor = entry.grade === 'F' ? '#FF595E' : gradeColor(entry.min + 0.5)
                  return (
                    <motion.div
                      key={entry.grade}
                      initial={false}
                      animate={active ? 'active' : 'rest'}
                      whileHover="hover"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}
                    >
                      <motion.span
                        variants={{
                          rest:   { color: 'rgba(255,255,255,0.75)', opacity: 0.5 },
                          active: { color: entryColor, opacity: 1 },
                          hover:  { color: entryColor, opacity: 1 },
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{ fontFamily: FONT_SANS, fontWeight: 900, fontSize: 12, minWidth: 24 }}
                      >
                        {entry.grade}
                      </motion.span>
                      <motion.span
                        variants={{
                          rest:   { color: entry.grade === 'F' ? '#FF595E' : C.muted, opacity: entry.grade === 'F' ? 0.6 : 0.5 },
                          active: { color: entryColor, opacity: 1 },
                          hover:  { color: entryColor, opacity: 1 },
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{ fontFamily: FONT_MONO, fontWeight: active ? 700 : 400, fontSize: 10 }}
                      >
                        {entry.rangeStr}
                      </motion.span>
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── Required view ── */}
        {view === 'required' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: compact ? undefined : 1, minHeight: 0, gap: 6 }}>
            {/* Target grade chips */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
              {chipScale.map((s) => {
                const chipColor = gradeColor(s.min + 0.5)
                const isActive  = s.grade === reqTarget
                return (
                  <motion.button
                    key={s.grade}
                    onClick={() => setReqTarget(s.grade)}
                    whileHover={{ scale: 1.06, borderColor: chipColor + '80', color: chipColor, background: chipColor + '18' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: `1px solid ${isActive ? chipColor + '80' : C.border}`,
                      background: isActive ? chipColor + '18' : 'transparent',
                      color: isActive ? chipColor : C.muted,
                      fontFamily: FONT_SANS,
                      fontWeight: 900,
                      fontSize: 10,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {s.grade}
                  </motion.button>
                )
              })}
            </div>

            {/* Per-category required scores */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {categories.map((cat) => {
                const needed     = requiredScore(reqTarget, categories, cat.id, scale)
                const catAccent  = colorHex(cat.color)
                const impossible = needed === null
                const achieved   = needed === 0
                const scoreColor = impossible ? C.dim : achieved ? '#2dd4a8' : gradeColor(needed)
                return (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: catAccent, flexShrink: 0 }} />
                      <span style={{ color: C.muted, fontFamily: FONT_SANS, fontWeight: 600, fontSize: 10 }}>{cat.name}</span>
                    </div>
                    <span style={{ color: scoreColor, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11 }}>
                      {impossible ? '—' : achieved ? '✓' : `${needed}%`}
                    </span>
                  </div>
                )
              })}
            </div>

            <p style={{ color: C.dim, fontFamily: FONT_SANS, fontSize: 9, margin: 0, letterSpacing: '0.06em', flexShrink: 0 }}>
              NEEDED IN EACH CATEGORY TO REACH TARGET
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
