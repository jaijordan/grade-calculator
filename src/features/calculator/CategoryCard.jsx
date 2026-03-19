import { useState, useEffect } from 'react'
import { motion, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import { useCardSpotlight, CardSpotlight } from '../../components/CardSpotlight'
import { categoryAverage, colorHex, gradeColor } from '../../utils/gradeCalc'
import Slider from '../../components/Slider'
import { C, CARD_BG, FONT_SANS, FONT_MONO } from './tokens'

// ─── Category Card ────────────────────────────────────────────────────────────
// compact=true → tile for mobile 2-col grid (no item list)
// compact=false (default) → full card for desktop grid cell
export default function CategoryCard({
  category, courseId, setItemGrade, toggleItem,
  wide = false, onClick, compact = false,
  previewValue, onPreviewChange, onPreviewEnd,
}) {
  const { spotX, spotY, handleMouseMove, handleMouseLeave } = useCardSpotlight()

  const accent      = colorHex(category.color)
  const avg         = categoryAverage(category.items)
  const realAvg     = Math.round(avg * 10) / 10
  const activeCount = category.items.filter((i) => i.active).length

  // Animated display value — instant during drag, springs back to realAvg on release
  const displayMV = useMotionValue(realAvg)
  const [displayNum, setDisplayNum] = useState(realAvg)

  useMotionValueEvent(displayMV, 'change', (v) => {
    setDisplayNum(Math.round(v * 10) / 10)
  })

  const isPreviewing = previewValue !== undefined

  useEffect(() => {
    if (previewValue !== undefined) {
      displayMV.jump(previewValue)      // instant — tracks slider with no lag
    } else if (Math.abs(displayMV.get() - realAvg) > 0.05) {
      const controls = animate(displayMV, realAvg, {
        type: 'spring', stiffness: 100, damping: 18,
      })
      return () => controls.stop()
    }
  }, [previewValue]) // realAvg intentionally omitted — only trigger on preview change

  // Sync display when item grades are edited externally (e.g. via ItemDetailModal)
  useEffect(() => {
    if (previewValue === undefined) displayMV.jump(realAvg)
  }, [realAvg])

  const displayColor = C.white
  const singleItem = activeCount === 1 ? category.items.find(i => i.active) : null
  const [isDragging, setIsDragging] = useState(false)

  function commitSingle() {
    if (singleItem) setItemGrade(courseId, category.id, singleItem.id, Math.round(displayMV.get()))
  }

  // Slider wrapper: stop click-propagation (don't open modal), handle release
  const sliderWrapper = (
    <div
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
      onMouseUp={() => { setIsDragging(false); commitSingle(); onPreviewEnd?.() }}
      onTouchEnd={() => { setIsDragging(false); commitSingle(); onPreviewEnd?.() }}
    >
      {!singleItem && !compact && (
        <p style={{
          position: 'absolute',
          bottom: 'calc(100% + 5px)',
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          color: 'rgba(255,255,255,0.65)',
          fontFamily: FONT_SANS,
          fontSize: 9,
          margin: 0,
          letterSpacing: '0.08em',
          opacity: isDragging ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
        }}>
          WHAT-IF PREVIEW
        </p>
      )}
      <Slider
        value={Math.round(displayNum)}
        onChange={(val) => onPreviewChange?.(val)}
      />
    </div>
  )

  if (compact) {
    return (
      <motion.div
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileTap={onClick ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.1 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 14,
          background: CARD_BG,
          border: `1px solid ${isPreviewing ? C.blue + '60' : C.border}`,
          boxSizing: 'border-box',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'border-color 0.15s',
        }}
      >
        <CardSpotlight spotX={spotX} spotY={spotY} color="rgba(255,255,255,0.06)" />
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
            <p style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 11, letterSpacing: '0.08em', margin: 0, flex: 1 }}>
              {category.name.toUpperCase()}
            </p>
            <WeightBadge weight={category.weight} accent={accent} small />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ color: displayColor, fontFamily: FONT_MONO, fontWeight: 900, fontSize: 32, lineHeight: 1, transition: 'color 0.1s' }}>{displayNum}</span>
            <span style={{ color: C.muted, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13 }}>%</span>
          </div>
          {sliderWrapper}
          <p style={{ color: C.muted, fontFamily: FONT_SANS, fontSize: 10, margin: 0 }}>
            {activeCount} {activeCount === 1 ? 'item' : 'items'} · tap to edit
          </p>
        </div>
      </motion.div>
    )
  }

  // Desktop full card
  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.1 }}
      style={{
        position: 'relative',
        height: '100%',
        borderRadius: 14,
        background: CARD_BG,
        border: `1px solid ${isPreviewing ? C.blue + '60' : C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <CardSpotlight spotX={spotX} spotY={spotY} color="rgba(255,255,255,0.06)" />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {wide ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexShrink: 0, marginBottom: 10 }}>
            <div>
              <p style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 12, letterSpacing: '0.1em', margin: 0 }}>{category.name.toUpperCase()}</p>
              <p style={{ color: C.muted, fontFamily: FONT_SANS, fontWeight: 500, fontSize: 10, margin: '3px 0 0', letterSpacing: '0.04em' }}>
                {activeCount} {activeCount === 1 ? 'item' : 'items'} · click to edit
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <WeightBadge weight={category.weight} accent={accent} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ color: displayColor, fontFamily: FONT_MONO, fontWeight: 900, fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1, transition: 'color 0.1s' }}>{displayNum}</span>
                <span style={{ color: C.muted, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 16 }}>%</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
              <div>
                <p style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 12, letterSpacing: '0.1em', margin: 0 }}>{category.name.toUpperCase()}</p>
                <p style={{ color: C.muted, fontFamily: FONT_SANS, fontWeight: 500, fontSize: 10, margin: '2px 0 0' }}>
                  {activeCount} {activeCount === 1 ? 'item' : 'items'} · click to edit
                </p>
              </div>
              <WeightBadge weight={category.weight} accent={accent} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, margin: '8px 0 6px', flexShrink: 0 }}>
              <span style={{ color: displayColor, fontFamily: FONT_MONO, fontWeight: 900, fontSize: 'clamp(36px,4.5vw,56px)', lineHeight: 1, transition: 'color 0.1s' }}>{displayNum}</span>
              <span style={{ color: C.muted, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 16, paddingBottom: 4 }}>%</span>
            </div>
          </>
        )}

        <div style={{ flexShrink: 0, marginBottom: wide ? 4 : 2 }}>
          {sliderWrapper}
        </div>

        {wide && (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
            {['0% – FAIL', '50% – MID', '100% – PERFECT'].map((label) => (
              <span key={label} style={{ color: C.dim, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 9, letterSpacing: '0.1em' }}>{label}</span>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginTop: wide ? 0 : 4 }}>
          {category.items.map((item) => (
            <DisplayItemRow key={item.id} item={item} accent={accent} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Display Item Row (read-only, desktop card) ────────────────────────────────
// Also used by OverflowCategoryCard
export function DisplayItemRow({ item, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: item.active ? 1 : 0.35 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.active ? (accent || C.blue) : C.dim, flexShrink: 0 }} />
      <span style={{ flex: 1, color: C.muted, fontFamily: FONT_SANS, fontWeight: 600, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      <span style={{ color: gradeColor(item.grade), fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11 }}>
        {Math.round(item.grade * 10) / 10}%
      </span>
    </div>
  )
}

// ─── Weight Badge ─────────────────────────────────────────────────────────────
// Also used by OverflowCategoryCard
export function WeightBadge({ weight, accent, small = false }) {
  return (
    <span style={{
      flexShrink: 0,
      backgroundColor: `${accent}1a`,
      color: accent,
      border: `1px solid ${accent}40`,
      borderRadius: 5,
      padding: small ? '2px 6px' : '3px 8px',
      fontFamily: FONT_SANS,
      fontWeight: 900,
      fontSize: small ? 9 : 10,
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
    }}>
      {weight}%
    </span>
  )
}
