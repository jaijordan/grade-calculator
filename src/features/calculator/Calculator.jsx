import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate, useMotionValueEvent } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useCourseStore from '../../store/useCourseStore'
import {
  totalGrade, getLetter, gradeColor,
  categoryAverage, colorHex, requiredScore,
  DEFAULT_SCALE, getGradeTheme,
} from '../../utils/gradeCalc'
import Slider from '../../components/Slider'
import CourseSwitcher from './CourseSwitcher'
import ItemDetailModal from './ItemDetailModal'
import { useCardSpotlight, CardSpotlight } from '../../components/CardSpotlight'
import { buttonHover } from '../../utils/hoverPresets'

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:      '#070809',                   // near-neutral dark (was blue-navy #070B17)
  card:    '#121416',                   // neutral dark (fallback; cards use gradient)
  card2:   '#191b1e',                   // slightly lighter neutral
  border:  'rgba(255,255,255,0.10)',    // slightly crisper on neutral surfaces
  muted:   '#7a7e86',                   // neutral gray (was blue-gray #6b8aaa)
  dim:     '#494d56',                   // neutral dark gray (was blue-gray #3d5a78)
  white:   '#ffffff',
  blue:    '#38BDF8',
}
// Subtle directional gradient for secondary card surfaces (Direction A+D)
const CARD_BG = 'linear-gradient(145deg, #131518 0%, #0e1012 100%)'
const FONT_SANS = '"Inter", sans-serif'
const FONT_MONO = '"JetBrains Mono", monospace'


// ─── Demo data (never persisted) ────────────────────────────────────────────
const DEMO_COURSE = {
  id: '__demo__',
  name: 'MTH 141',
  institution: 'University at Buffalo',
  semester: 'Spring 2026',
  scale: DEFAULT_SCALE,
  categories: [
    {
      id: 'demo-hw', name: 'Homework', weight: 15, color: 'green',
      items: [
        { id: 'hw1', label: 'HW 1', grade: 95, active: true },
        { id: 'hw2', label: 'HW 2', grade: 97, active: true },
        { id: 'hw3', label: 'HW 3', grade: 92, active: true },
        { id: 'hw4', label: 'HW 4', grade: 98, active: true },
        { id: 'hw5', label: 'HW 5', grade: 94, active: true },
        { id: 'hw6', label: 'HW 6', grade: 96, active: true },
      ],
    },
    {
      id: 'demo-qz', name: 'Quizzes', weight: 15, color: 'blue',
      items: [
        { id: 'qz1', label: 'Quiz 1', grade: 88, active: true },
        { id: 'qz2', label: 'Quiz 2', grade: 85, active: true },
        { id: 'qz3', label: 'Quiz 3', grade: 92, active: true },
        { id: 'qz4', label: 'Quiz 4', grade: 84, active: true },
        { id: 'qz5', label: 'Quiz 5', grade: 90, active: true },
        { id: 'qz6', label: 'Quiz 6', grade: 87, active: true },
      ],
    },
    {
      id: 'demo-ex', name: 'Exams 1 & 2', weight: 40, color: 'purple',
      items: [
        { id: 'ex1', label: 'Exam 1', grade: 82, active: true },
        { id: 'ex2', label: 'Exam 2', grade: 82, active: true },
      ],
    },
    {
      id: 'demo-final', name: 'Final Exam', weight: 30, color: 'pink',
      items: [{ id: 'fe1', label: 'Final Exam', grade: 75, active: true }],
    },
  ],
}

// ─── Calculator (page root) ──────────────────────────────────────────────────
export default function Calculator() {
  const navigate = useNavigate()
  const {
    courses, activeCourseId, setActiveCourse,
    setItemGrade, toggleItem, deleteCourse,
  } = useCourseStore()

  const isDemo  = Object.keys(courses).length === 0
  const [demoCourse, setDemoCourse] = useState(() => DEMO_COURSE)
  const courseId = isDemo ? '__demo__' : (activeCourseId ?? Object.keys(courses)[0])
  const course   = isDemo ? demoCourse : (courses[activeCourseId] ?? Object.values(courses)[0])

  // ── Demo prompt ─────────────────────────────────────────────────────────
  const [showPrompt,      setShowPrompt]      = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(
    () => sessionStorage.getItem('demoDismissed') === '1'
  )
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isDemo || promptDismissed) return
    timerRef.current = setTimeout(() => setShowPrompt(true), 800)
    return () => clearTimeout(timerRef.current)
  }, [isDemo, promptDismissed])

  useEffect(() => {
    if (isDemo) { setShowPrompt(false); setPromptDismissed(false); sessionStorage.removeItem('demoDismissed') }
  }, [isDemo])

  // Reset demo course to initial data whenever demo mode is entered
  useEffect(() => { if (isDemo) setDemoCourse(DEMO_COURSE) }, [isDemo])

  // ── Item detail modal ───────────────────────────────────────────────────
  const [openCatId, setOpenCatId] = useState(null)
  const openCategory = course?.categories.find((c) => c.id === openCatId) ?? null

  // ── Course switcher ─────────────────────────────────────────────────────
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // ── Overflow category navigation ─────────────────────────────────────────
  const [overflowIdx, setOverflowIdx] = useState(0)
  useEffect(() => { setOverflowIdx(0) }, [courseId])

  // Auto-navigate to newly added overflow category
  // Compute overflow length here (before the early return) to avoid TDZ in the dependency array
  const overflowLen = Math.max(0, (course?.categories.length ?? 0) - 3)
  const prevOverflowLenRef = useRef(null)
  useEffect(() => {
    if (prevOverflowLenRef.current === null) {
      prevOverflowLenRef.current = overflowLen
      return
    }
    if (overflowLen > prevOverflowLenRef.current) {
      setOverflowIdx(overflowLen - 1)
    }
    prevOverflowLenRef.current = overflowLen
  }, [overflowLen])

  // ── Slider preview (what-if, never persisted) ────────────────────────────
  // previewGrades: { [catId]: number } — overrides real avg while dragging
  const [previewGrades, setPreviewGrades] = useState({})
  const previewTimers = useRef({})

  // Clear all pending preview timers on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      Object.values(previewTimers.current).forEach(clearTimeout)
    }
  }, [])

  function handlePreviewChange(catId, val) {
    clearTimeout(previewTimers.current[catId])
    setPreviewGrades((prev) => ({ ...prev, [catId]: val }))
  }

  function handlePreviewEnd(catId) {
    previewTimers.current[catId] = setTimeout(() => {
      setPreviewGrades((prev) => {
        const next = { ...prev }
        delete next[catId]
        return next
      })
    }, 1200)
  }

  if (!course) return null

  // Use preview overrides when computing the projected grade
  const grade = course.categories.reduce((acc, cat) => {
    const avg = previewGrades[cat.id] !== undefined ? previewGrades[cat.id] : categoryAverage(cat.items)
    return acc + (avg * cat.weight) / 100
  }, 0)
  const rounded = Math.round(grade * 10) / 10
  const letter  = getLetter(grade, course.scale)

  const [cat0, cat1, cat2] = course.categories
  const overflowCats = course.categories.slice(3)
  const hasRows     = course.categories.length >= 3
  const gridRows    = hasRows ? '1fr 1fr' : '1fr'
  const heroRowSpan = hasRows ? '1 / 3' : '1 / 2'

  // ── Demo mutations (local state only, never persisted to Zustand) ──────────
  function demoSetItemGrade(_cid, catId, itemId, grade) {
    setDemoCourse((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, grade: Math.min(100, Math.max(0, Number(grade))) } : item) }
          : cat
      ),
    }))
  }

  function demoToggleItem(_cid, catId, itemId) {
    setDemoCourse((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, active: !item.active } : item) }
          : cat
      ),
    }))
  }

  function demoAddItem(_cid, catId) {
    setDemoCourse((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => {
        if (cat.id !== catId) return cat
        const newItem = { id: `demo-${Date.now()}`, label: 'New Item', grade: 85, active: true }
        return { ...cat, items: [...cat.items, newItem] }
      }),
    }))
  }

  function demoDeleteItem(_cid, catId, itemId) {
    setDemoCourse((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => {
        if (cat.id !== catId) return cat
        if (cat.items.length <= 1) return cat
        return { ...cat, items: cat.items.filter((i) => i.id !== itemId) }
      }),
    }))
  }

  function demoRenameItem(_cid, catId, itemId, label) {
    setDemoCourse((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, label } : item) }
          : cat
      ),
    }))
  }

  const demoHandlers = { setItemGrade: demoSetItemGrade, toggleItem: demoToggleItem, addItem: demoAddItem, deleteItem: demoDeleteItem, renameItem: demoRenameItem }

  const actions = {
    setItemGrade: isDemo ? demoSetItemGrade : setItemGrade,
    toggleItem:   isDemo ? demoToggleItem   : toggleItem,
    courseId,
  }

  const openModal = (id) => setOpenCatId(id)

  function handleDeleteCourse(id) {
    deleteCourse(id)
  }

  // ── Shared header content ────────────────────────────────────────────────
  const HeaderLeft = (
    <div>
      {isDemo && (
        <div style={{ color: C.dim, fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 6 }}>
          DEMO MODE
        </div>
      )}
      <div style={{ color: C.white, fontWeight: 900, fontSize: 'clamp(22px, 3.5vw, 44px)', lineHeight: 0.88, letterSpacing: '-0.02em', fontFamily: FONT_SANS }}>GRADE</div>
      <div style={{ color: C.blue,  fontWeight: 900, fontSize: 'clamp(22px, 3.5vw, 44px)', lineHeight: 0.88, letterSpacing: '-0.02em', fontFamily: FONT_SANS }}>CALCULATOR</div>
    </div>
  )

  const HeaderRight = !isDemo ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <CourseSwitcher
        courses={courses}
        activeCourseId={activeCourseId ?? Object.keys(courses)[0]}
        open={switcherOpen}
        onToggle={() => setSwitcherOpen((v) => !v)}
        onSelect={(id) => setActiveCourse(id)}
        onAdd={() => navigate('/course/new/setup')}
        onEdit={(id) => navigate(`/course/${id}/setup`)}
        onDelete={handleDeleteCourse}
        align="right"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em' }}>{course.name}</span>
          <span style={{ color: C.muted, fontSize: 10, lineHeight: 1 }}>▾</span>
        </div>
      </CourseSwitcher>
      {course.institution && <span style={{ color: C.muted, fontFamily: FONT_SANS, fontSize: 11 }}>{course.institution}</span>}
      {course.semester    && <span style={{ color: C.dim,   fontFamily: FONT_SANS, fontSize: 11 }}>{course.semester}</span>}
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, paddingBottom: 2 }}>
      <span style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em' }}>{course.name}</span>
      {course.institution && <span style={{ color: C.muted, fontFamily: FONT_SANS, fontSize: 11 }}>{course.institution}</span>}
      {course.semester    && <span style={{ color: C.dim,   fontFamily: FONT_SANS, fontSize: 11 }}>{course.semester}</span>}
      <motion.button
        {...buttonHover}
        onClick={() => navigate('/course/new/setup')}
        style={{ marginTop: 4, padding: '5px 12px', backgroundColor: C.blue, border: 'none', borderRadius: 8, color: '#000', fontFamily: FONT_SANS, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}
      >
        GET STARTED
      </motion.button>
    </div>
  )

  return (
    // Root: scrollable on mobile, fixed viewport on desktop
    <div
      className="flex flex-col overflow-y-auto md:overflow-hidden md:h-dvh"
      style={{ minHeight: '100dvh', background: C.bg, fontFamily: FONT_SANS }}
    >

      {/* ── Header (shared) ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-end justify-between gap-4"
           style={{ padding: '16px 20px 10px' }}>
        {HeaderLeft}
        {HeaderRight}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on md+)
          Single-column, scrollable, card-based
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 pb-6 md:hidden" style={{ padding: '0 16px 80px' }}>

        {/* Compact grade hero */}
        <GradeHero letter={letter} grade={rounded} compact />

        {/* Category tiles — 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          {course.categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              {...actions}
              onClick={() => openModal(cat.id)}
              previewValue={previewGrades[cat.id]}
              onPreviewChange={(val) => handlePreviewChange(cat.id, val)}
              onPreviewEnd={() => handlePreviewEnd(cat.id)}
              compact
            />
          ))}
          {/* Add Category tile — fills gap when odd, spans full width when even */}
          {!isDemo && (() => {
            const isEven = course.categories.length % 2 === 0
            return (
              <motion.button
                onClick={() => navigate(`/course/${courseId}/setup?addCategory=1`)}
                whileHover={{ borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                transition={{ duration: 0.15 }}
                className={isEven ? 'col-span-2' : ''}
                style={{
                  background: 'transparent',
                  border: `1px dashed ${C.border}`,
                  borderRadius: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: isEven ? '14px 0' : undefined,
                }}
              >
                <span style={{ color: C.dim, fontSize: 20, lineHeight: 1, fontWeight: 300 }}>+</span>
                <span style={{ color: C.dim, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 9, letterSpacing: '0.12em' }}>ADD CATEGORY</span>
              </motion.button>
            )
          })()}
        </div>

        {/* Letter scale */}
        <LetterScale scale={course.scale} currentGrade={rounded} categories={course.categories} compact />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden on mobile, shown on md+)
          Fixed-height viewport grid — unchanged original layout
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden md:grid md:flex-1 md:min-h-0"
        style={{ padding: '0 20px 14px', gridTemplateRows: '3fr 2fr', gap: 12 }}
      >
        {/* Top row: hero + category cards */}
        <div
          style={{
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: gridRows,
            gap: 12,
          }}
        >
          <div style={{ gridColumn: '1', gridRow: heroRowSpan, minHeight: 0 }}>
            <GradeHero letter={letter} grade={rounded} />
          </div>

          {cat0 && (
            <div style={{ gridColumn: '2', gridRow: '1', minHeight: 0 }}>
              <CategoryCard category={cat0} {...actions} onClick={() => openModal(cat0.id)}
                previewValue={previewGrades[cat0.id]}
                onPreviewChange={(val) => handlePreviewChange(cat0.id, val)}
                onPreviewEnd={() => handlePreviewEnd(cat0.id)} />
            </div>
          )}

          {cat1 && (
            <div style={{ gridColumn: '3', gridRow: '1', minHeight: 0 }}>
              <CategoryCard category={cat1} {...actions} onClick={() => openModal(cat1.id)}
                previewValue={previewGrades[cat1.id]}
                onPreviewChange={(val) => handlePreviewChange(cat1.id, val)}
                onPreviewEnd={() => handlePreviewEnd(cat1.id)} />
            </div>
          )}

          {cat2 && (
            <div style={{ gridColumn: '2 / 4', gridRow: '2', minHeight: 0 }}>
              <CategoryCard category={cat2} {...actions} wide onClick={() => openModal(cat2.id)}
                previewValue={previewGrades[cat2.id]}
                onPreviewChange={(val) => handlePreviewChange(cat2.id, val)}
                onPreviewEnd={() => handlePreviewEnd(cat2.id)} />
            </div>
          )}
        </div>

        {/* Bottom row: overflow card + letter scale */}
        <div style={{ minHeight: 0, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <OverflowCategoryCard
            overflowCats={overflowCats}
            activeIdx={overflowIdx}
            onSelectIdx={setOverflowIdx}
            {...actions}
            onClick={(id) => openModal(id)}
            previewGrades={previewGrades}
            onPreviewChange={handlePreviewChange}
            onPreviewEnd={handlePreviewEnd}
            navigate={navigate}
            isDemo={isDemo}
            courseId={courseId}
          />
          <LetterScale scale={course.scale} currentGrade={rounded} categories={course.categories} />
        </div>
      </div>

      {/* ── Demo prompt ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDemo && showPrompt && !promptDismissed && (
          <DemoPrompt
            onDismiss={() => { setShowPrompt(false); setPromptDismissed(true); sessionStorage.setItem('demoDismissed', '1') }}
            onGetStarted={() => navigate('/course/new/setup')}
          />
        )}
      </AnimatePresence>

      {/* ── Item detail modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {openCategory && (
          <ItemDetailModal
            courseId={courseId}
            category={openCategory}
            onClose={() => setOpenCatId(null)}
            handlers={isDemo ? demoHandlers : null}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Demo Prompt ─────────────────────────────────────────────────────────────
function DemoPrompt({ onDismiss, onGetStarted }) {
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

// ─── Grade Hero ──────────────────────────────────────────────────────────────
// compact=true → short horizontal strip for mobile
// compact=false (default) → tall card filling its grid cell
//
// Layer stack (bottom → top):
//   1. Ambient gradient   — inset: 0, breathes on 16 s loop, NO cursor response
//   2. Cursor spotlight   — large soft circle, left/top track cursor via springs
//   3. Orb 1              — top-left area, left/top follow cursor, scale breathes
//   4. Orb 2              — bottom-right area, right/bottom follow inversely
//   5. Content            — z-index: 10, never moves
function GradeHero({ letter, grade, compact = false }) {
  const theme = getGradeTheme(grade)

  // ── Mouse tracking: 0–1, 0.5 = centre ────────────────────────────────────
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

  // ── Background layers (shared by compact + desktop) ───────────────────────
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
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {AnimatedBackground}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONT_SANS, fontWeight: 900, fontSize: 9, letterSpacing: '0.16em', margin: '0 0 4px' }}>
            PROJECTED GRADE
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ color: '#fff', fontFamily: FONT_MONO, fontWeight: 900, fontSize: 52, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {letter}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 22 }}>
              {grade}%
            </span>
          </div>
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
        <div style={{ color: '#ffffff', fontFamily: FONT_MONO, fontWeight: 900, fontSize: 'clamp(56px, 7vw, 96px)', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {letter}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 22, marginTop: 6 }}>
          {grade}%
        </div>
      </div>
    </div>
  )
}

// ─── Category Card ───────────────────────────────────────────────────────────
// compact=true → tile for mobile 2-col grid (no item list)
// compact=false (default) → full card for desktop grid cell
function CategoryCard({
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

// ─── Display Item Row (read-only, desktop card) ───────────────────────────────
function DisplayItemRow({ item, accent }) {
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

// ─── Weight Badge ────────────────────────────────────────────────────────────
function WeightBadge({ weight, accent, small = false }) {
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

// ─── Overflow Category Card ───────────────────────────────────────────────────
// Shows categories 4+ in the bottom-left desktop slot.
// When no overflow categories exist, renders an "Add Category" empty state.
function OverflowCategoryCard({
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

  // ── Empty state ────────────────────────────────────────────────────────────
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

  // ── Overflow category render ───────────────────────────────────────────────
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

// ─── Letter Scale ────────────────────────────────────────────────────────────
function LetterScale({ scale, currentGrade, categories = [], compact = false }) {
  const { spotX, spotY, handleMouseMove, handleMouseLeave } = useCardSpotlight()

  const [view, setView] = useState('scale') // 'scale' | 'required'

  // Required score state
  const currentLetter   = getLetter(currentGrade, scale)
  const currentScaleIdx = scale.findIndex(s => s.grade === currentLetter)
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
