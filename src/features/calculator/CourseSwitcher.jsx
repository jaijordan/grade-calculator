import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { totalGrade, getLetter } from '../../utils/gradeCalc'

const C = {
  card:   '#131416',
  border: 'rgba(255,255,255,0.10)',
  muted:  '#7a7e86',
  dim:    '#494d56',
  white:  '#ffffff',
  blue:   '#38BDF8',
  red:    '#f43f5e',
}
const FONT_SANS = '"Inter", sans-serif'
const FONT_MONO = '"JetBrains Mono", monospace'

/**
 * Props:
 *   courses, activeCourseId, open, onToggle, onSelect, onAdd, onEdit, onDelete
 *   align?: 'left' | 'right'   — which edge of the trigger the dropdown aligns to
 *   children                   — custom trigger content; if omitted, renders a default name button
 */
export default function CourseSwitcher({
  courses, activeCourseId, onSelect, onAdd, onEdit, onDelete,
  open, onToggle,
  align = 'left',
  children,
}) {
  const ref = useRef(null)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => {
    if (!open) { setConfirmId(null); return }
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onToggle])

  const courseList   = Object.values(courses)
  const activeCourse = courses[activeCourseId] ?? courseList[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div onClick={onToggle} style={{ cursor: 'pointer' }}>
        {children ?? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em' }}>
              {activeCourse?.name ?? 'Select Course'}
            </span>
            <span style={{ color: C.muted, fontSize: 10, lineHeight: 1 }}>▾</span>
          </div>
        )}
      </div>

      {/* Dropdown panel */}
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          ...(align === 'right' ? { right: 0 } : { left: 0 }),
          zIndex: 100,
          backgroundColor: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          minWidth: 260,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {courseList.map((course) => {
            const grade    = totalGrade(course.categories)
            const letter   = getLetter(grade, course.scale)
            const rounded  = Math.round(grade * 10) / 10
            const isActive = course.id === (activeCourseId ?? courseList[0]?.id)
            const pending  = confirmId === course.id

            return (
              <div
                key={course.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  backgroundColor: pending
                    ? 'rgba(244,63,94,0.07)'
                    : isActive ? 'rgba(56,189,248,0.07)' : 'transparent',
                  borderBottom: `1px solid ${C.border}`,
                  transition: 'background-color 0.15s',
                  cursor: pending ? 'default' : 'pointer',
                }}
                onClick={() => { if (!pending) { onSelect(course.id); onToggle() } }}
              >
                {pending ? (
                  /* ── Inline delete confirmation ── */
                  <>
                    <span style={{ flex: 1, color: C.red, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>
                      Delete "{course.name}"?
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(course.id); onToggle() }}
                      style={{ background: 'none', border: `1px solid ${C.red}`, borderRadius: 5, cursor: 'pointer', color: C.red, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 10, padding: '3px 9px', letterSpacing: '0.06em' }}
                    >
                      DELETE
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(null) }}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.muted, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 10, padding: '3px 9px', letterSpacing: '0.06em' }}
                    >
                      CANCEL
                    </button>
                  </>
                ) : (
                  /* ── Normal course row ── */
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12 }}>{course.name}</div>
                      {course.semester && (
                        <div style={{ color: C.muted, fontFamily: FONT_SANS, fontSize: 10, marginTop: 1 }}>{course.semester}</div>
                      )}
                    </div>
                    <span style={{ color: C.blue, fontFamily: FONT_MONO, fontWeight: 900, fontSize: 13 }}>
                      {letter} · {rounded}%
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(course.id) }}
                      title="Edit course"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 12, padding: '2px 4px', borderRadius: 4 }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(course.id) }}
                      title="Delete course"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            )
          })}

          {/* Add Course row */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer' }}
            onClick={() => { onAdd(); onToggle() }}
          >
            <span style={{ color: C.blue, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12 }}>+ Add Course</span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
