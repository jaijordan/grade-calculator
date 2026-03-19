import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useCourseStore from '../../store/useCourseStore'
import { categoryAverage } from '../../utils/gradeCalc'
import Slider from '../../components/Slider'
import Toggle from '../../components/Toggle'

const C = {
  card:   '#131416',
  card2:  '#1a1c1f',
  border: 'rgba(255,255,255,0.08)',
  muted:  '#7a7e86',
  dim:    '#494d56',
  white:  '#ffffff',
  red:    '#f43f5e',
}
const FONT_SANS = '"Inter", sans-serif'
const FONT_MONO = '"JetBrains Mono", monospace'

export default function ItemDetailModal({ courseId, category, onClose, handlers }) {
  const store = useCourseStore()
  const { setItemGrade, toggleItem, addItem, deleteItem, renameItem } = handlers ?? store
  const avg         = categoryAverage(category.items)
  const backdropRef = useRef(null)

  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <motion.div
      ref={backdropRef}
      onClick={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '78vh',
          backgroundColor: C.card,
          borderRadius: 16,
          border: `1px solid rgba(255,255,255,0.10)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >

        {/* ── Header ── */}
        <div style={{
          flexShrink: 0,
          padding: '22px 28px 18px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
              <span style={{
                color: C.white,
                fontFamily: FONT_SANS,
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: '0.06em',
              }}>
                {category.name.toUpperCase()}
              </span>
              <span style={{
                color: C.dim,
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.04em',
              }}>
                {category.weight}% wt
              </span>
            </div>
            <div style={{ color: C.muted, fontFamily: FONT_SANS, fontSize: 11 }}>
              {category.items.filter(i => i.active).length} active · {category.items.length} total
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.dim, fontFamily: FONT_SANS, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 2 }}>
                AVERAGE
              </div>
              <span style={{ color: 'rgba(255,255,255,0.90)', fontFamily: FONT_MONO, fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em' }}>
                {Math.round(avg * 10) / 10}
                <span style={{ fontSize: 13, marginLeft: 2, color: C.muted }}>%</span>
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                cursor: 'pointer',
                color: C.muted,
                fontSize: 18,
                lineHeight: 1,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Scrollable item list ── */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 28px 0',
          scrollbarGutter: 'stable',
        }}>
          <AnimatePresence initial={false}>
            {category.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <ModalItemRow
                  item={item}
                  canDelete={category.items.length > 1}
                  onGradeChange={(val) => setItemGrade(courseId, category.id, item.id, val)}
                  onToggle={() => toggleItem(courseId, category.id, item.id)}
                  onDelete={() => deleteItem(courseId, category.id, item.id)}
                  onRename={(label) => renameItem(courseId, category.id, item.id, label)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div style={{ height: 14 }} />
        </div>

        {/* ── Footer ── */}
        <div style={{
          flexShrink: 0,
          borderTop: `1px solid ${C.border}`,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)', transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
            onClick={() => addItem(courseId, category.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.10)`,
              borderRadius: 9,
              padding: '9px 18px',
              color: 'rgba(255,255,255,0.75)',
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            + ADD ITEM
          </motion.button>
          <span style={{ color: C.dim, fontFamily: FONT_SANS, fontSize: 10, letterSpacing: '0.08em' }}>
            ESC TO CLOSE
          </span>
        </div>

      </motion.div>
    </motion.div>
  )
}

function ModalItemRow({ item, canDelete, onGradeChange, onToggle, onDelete, onRename }) {
  return (
    <div style={{
      padding: '16px 0',
      borderBottom: `1px solid rgba(255,255,255,0.05)`,
      opacity: item.active ? 1 : 0.35,
      transition: 'opacity 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Toggle
          checked={item.active}
          onChange={onToggle}
          accentColor='rgba(255,255,255,0.55)'
          label={`Toggle ${item.label}`}
        />
        <input
          type="text"
          defaultValue={item.label}
          onBlur={(e) => {
            const val = e.target.value.trim()
            if (val && val !== item.label) onRename(val)
          }}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            borderBottom: `1px solid rgba(255,255,255,0.07)`,
            color: item.active ? C.white : C.muted,
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: 13,
            padding: '4px 0',
            outline: 'none',
            minWidth: 0,
            textDecoration: item.active ? 'none' : 'line-through',
          }}
        />
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(item.grade * 10) / 10}
          onChange={(e) => {
            const val = Math.min(100, Math.max(0, Number(e.target.value)))
            onGradeChange(val)
          }}
          style={{
            width: 62,
            backgroundColor: C.card2,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 7,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: FONT_MONO,
            fontWeight: 700,
            fontSize: 13,
            padding: '6px 8px',
            textAlign: 'center',
            outline: 'none',
          }}
        />
        <span style={{ color: C.dim, fontFamily: FONT_MONO, fontSize: 11, width: 12 }}>%</span>
        <DeleteButton onDelete={onDelete} canDelete={canDelete} />
      </div>
      <Slider
        value={Math.round(item.grade)}
        onChange={onGradeChange}
        disabled={!item.active}
        label={`Grade for ${item.label}`}
      />
    </div>
  )
}

function DeleteButton({ onDelete, canDelete }) {
  return (
    <motion.button
      onClick={onDelete}
      disabled={!canDelete}
      title="Delete item"
      whileHover={canDelete ? { color: C.red } : undefined}
      transition={{ duration: 0.15 }}
      style={{
        background: 'none',
        border: 'none',
        cursor: canDelete ? 'pointer' : 'not-allowed',
        color: C.dim,
        fontSize: 20,
        lineHeight: 1,
        padding: '2px 4px',
        borderRadius: 4,
        opacity: canDelete ? 1 : 0.25,
        flexShrink: 0,
      }}
    >
      ×
    </motion.button>
  )
}
