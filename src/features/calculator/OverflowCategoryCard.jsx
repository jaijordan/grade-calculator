import { useState, useEffect } from 'react'
import { motion, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import { useCardSpotlight, CardSpotlight } from '../../components/CardSpotlight'
import { categoryAverage, colorHex } from '../../utils/gradeCalc'
import Slider from '../../components/Slider'
import { buttonHover } from '../../utils/hoverPresets'
import { DisplayItemRow, WeightBadge } from './CategoryCard'
import { C, CARD_BG, FONT_SANS, FONT_MONO } from './tokens'

// ─── Overflow Category Card ───────────────────────────────────────────────────
// Shows categories 4+ in the bottom-left desktop slot.
// When no overflow categories exist, renders an "Add Category" empty state.
export default function OverflowCategoryCard({
  overflowCats,
  activeIdx,
  onSelectIdx,
  courseId, setItemGrade, toggleItem,
  onClick,
  previewGrades,
  onPreviewChange,
  onPreviewEnd,
  navigate,
  isDemo,
}) {
  const { spotX, spotY, handleMouseMove, handleMouseLeave } = useCardSpotlight()

  // Compute activeCat before hooks — hooks must run unconditionally
  const safeIdx   = overflowCats.length > 0 ? Math.min(activeIdx, overflowCats.length - 1) : 0
  const activeCat = overflowCats[safeIdx] ?? null
  const realAvg   = activeCat ? Math.round(categoryAverage(activeCat.items) * 10) / 10 : 0

  // Animated display value — instant during drag, springs back to realAvg on release
  const displayMV = useMotionValue(realAvg)
  const [displayNum, setDisplayNum] = useState(realAvg)

  useMotionValueEvent(displayMV, 'change', (v) => {
    setDisplayNum(Math.round(v * 10) / 10)
  })

  // Reset instantly when the active overflow category changes
  useEffect(() => {
    if (!activeCat) return
    displayMV.jump(realAvg)
  }, [activeCat?.id]) // realAvg intentionally omitted — only trigger on category switch

  const previewVal   = activeCat ? previewGrades[activeCat.id] : undefined
  const isPreviewing = previewVal !== undefined

  // Spring back to real avg after preview ends
  useEffect(() => {
    if (!activeCat) return
    if (previewVal !== undefined) {
      displayMV.jump(previewVal)
    } else if (Math.abs(displayMV.get() - realAvg) > 0.05) {
      const controls = animate(displayMV, realAvg, {
        type: 'spring', stiffness: 100, damping: 18,
      })
      return () => controls.stop()
    }
  }, [previewVal]) // realAvg intentionally omitted — only trigger on preview change

  // Sync display when item grades are edited externally (e.g. via ItemDetailModal)
  useEffect(() => {
    if (activeCat && previewVal === undefined) displayMV.jump(realAvg)
  }, [realAvg])

  const [isDragging, setIsDragging] = useState(false)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (overflowCats.length === 0) {
    return (
      <div
        className="card-hoverable"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          height: '100%',
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
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, padding: '14px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', gap: 6 }}>
          <div style={{ color: C.dim, fontSize: 40, lineHeight: 1, fontWeight: 300, fontFamily: FONT_SANS }}>+</div>
          <div style={{ color: C.muted, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 11, letterSpacing: '0.14em' }}>ADD CATEGORY</div>
          <div style={{ color: C.dim, fontFamily: FONT_SANS, fontSize: 10, textAlign: 'center', maxWidth: 180, lineHeight: 1.5 }}>
            A 4th+ category will appear here with navigation between them.
          </div>
          <motion.button
            {...buttonHover}
            onClick={() => navigate(isDemo ? '/course/new/setup' : `/course/${courseId}/setup`)}
            style={{ marginTop: 6, padding: '7px 16px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            CONFIGURE
          </motion.button>
        </div>
      </div>
    )
  }

  // ── Overflow category render ──────────────────────────────────────────────────
  // (safeIdx, activeCat, previewVal, isPreviewing all computed above before hooks)
  const accent       = colorHex(activeCat.color)
  const activeCount  = activeCat.items.filter((i) => i.active).length
  const displayColor = C.white
  const singleItem   = activeCount === 1 ? activeCat.items.find(i => i.active) : null

  return (
    <motion.div
      className="card-hoverable"
      onClick={() => onClick(activeCat.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.985 }}
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
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <CardSpotlight spotX={spotX} spotY={spotY} color="rgba(255,255,255,0.04)" />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {/* Header: name + weight badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
          <div>
            <p style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 12, letterSpacing: '0.1em', margin: 0 }}>
              {activeCat.name.toUpperCase()}
            </p>
            <p style={{ color: C.muted, fontFamily: FONT_SANS, fontWeight: 500, fontSize: 10, margin: '2px 0 0' }}>
              {activeCount} {activeCount === 1 ? 'item' : 'items'} · click to edit
            </p>
          </div>
          <WeightBadge weight={activeCat.weight} accent={accent} />
        </div>

        {/* Grade number */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, margin: '8px 0 6px', flexShrink: 0 }}>
          <span style={{ color: displayColor, fontFamily: FONT_MONO, fontWeight: 900, fontSize: 'clamp(36px,4.5vw,56px)', lineHeight: 1, transition: 'color 0.1s' }}>
            {displayNum}
          </span>
          <span style={{ color: C.muted, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 16, paddingBottom: 4 }}>%</span>
        </div>

        {/* Preview slider */}
        <div
          style={{ position: 'relative', flexShrink: 0, marginBottom: 2 }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onMouseUp={() => { setIsDragging(false); if (singleItem) setItemGrade(courseId, activeCat.id, singleItem.id, Math.round(displayMV.get())); onPreviewEnd(activeCat.id) }}
          onTouchEnd={() => { setIsDragging(false); if (singleItem) setItemGrade(courseId, activeCat.id, singleItem.id, Math.round(displayMV.get())); onPreviewEnd(activeCat.id) }}
        >
          {!singleItem && (
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
          <Slider value={Math.round(displayNum)} onChange={(val) => onPreviewChange(activeCat.id, val)} />
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginTop: 4 }}>
          {activeCat.items.map((item) => (
            <DisplayItemRow key={item.id} item={item} accent={accent} />
          ))}
        </div>

        {/* Navigation strip (hidden when only 1 overflow category) */}
        {overflowCats.length > 1 && (
          <div
            style={{ flexShrink: 0, marginTop: 8, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {overflowCats.map((cat, idx) => {
              const chipAccent = colorHex(cat.color)
              const isActive   = idx === safeIdx
              return (
                <motion.button
                  {...buttonHover}
                  key={cat.id}
                  onClick={() => onSelectIdx(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 8px',
                    borderRadius: 20,
                    border: `1px solid ${isActive ? chipAccent + '80' : C.border}`,
                    background: 'transparent',
                    color: isActive ? chipAccent : C.muted,
                    fontFamily: FONT_SANS,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 10,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: chipAccent, flexShrink: 0, display: 'inline-block' }} />
                  {cat.name}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
