import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useCourseStore from '../../store/useCourseStore'
import { getLetter, categoryAverage, DEFAULT_SCALE } from '../../utils/gradeCalc'
import { buttonHover } from '../../utils/hoverPresets'
import CourseSwitcher from './CourseSwitcher'
import ItemDetailModal from './ItemDetailModal'
import GradeHero from './GradeHero'
import CategoryCard from './CategoryCard'
import OverflowCategoryCard from './OverflowCategoryCard'
import LetterScale from './LetterScale'
import DemoPrompt from './DemoPrompt'
import DemoBanner from './DemoBanner'
import { C, FONT_SANS, FONT_MONO } from './tokens'

// ─── Demo data (never persisted) ─────────────────────────────────────────────
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

// ─── Calculator (page root) ───────────────────────────────────────────────────
export default function Calculator() {
  const navigate = useNavigate()
  const {
    courses, activeCourseId, setActiveCourse,
    setItemGrade, toggleItem, deleteCourse,
  } = useCourseStore()

  const isDemo  = Object.keys(courses).length === 0
  const [demoCourse, setDemoCourse] = useState(() => {
    const saved = sessionStorage.getItem('demoCourse')
    return saved ? JSON.parse(saved) : DEMO_COURSE
  })
  const courseId = isDemo ? '__demo__' : (activeCourseId ?? Object.keys(courses)[0])
  const course   = isDemo ? demoCourse : (courses[activeCourseId] ?? Object.values(courses)[0])

  // ── Demo prompt ──────────────────────────────────────────────────────────────
  const [showPrompt,      setShowPrompt]      = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(
    () => sessionStorage.getItem('demoDismissed') === '1'
  )
  const [bannerReady, setBannerReady] = useState(false)
  const [showBanner,  setShowBanner]  = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isDemo || promptDismissed) return
    timerRef.current = setTimeout(() => setShowPrompt(true), 800)
    return () => clearTimeout(timerRef.current)
  }, [isDemo, promptDismissed])

  useEffect(() => {
    if (showPrompt) sessionStorage.setItem('demoDismissed', '1')
  }, [showPrompt])

  useEffect(() => {
    if (isDemo) sessionStorage.setItem('demoCourse', JSON.stringify(demoCourse))
  }, [demoCourse, isDemo])

  const prevIsDemoRef = useRef(null)
  useEffect(() => {
    if (prevIsDemoRef.current === false && isDemo) {
      setShowPrompt(false)
      setPromptDismissed(false)
      setBannerReady(false)
      setShowBanner(false)
      sessionStorage.removeItem('demoDismissed')
      sessionStorage.removeItem('demoCourse')
      setDemoCourse(DEMO_COURSE)
    }
    prevIsDemoRef.current = isDemo
  }, [isDemo])

  // ── Item detail modal ────────────────────────────────────────────────────────
  const [openCatId, setOpenCatId] = useState(null)
  const openCategory = course?.categories.find((c) => c.id === openCatId) ?? null

  const [addCourseHovered, setAddCourseHovered] = useState(false)

  // ── Course switcher ──────────────────────────────────────────────────────────
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // ── Overflow category navigation + mobile carousel ───────────────────────────
  const [overflowIdx, setOverflowIdx] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)
  const trackRef  = useRef(null)
  const scrollRAF = useRef(null)
  // Reset navigation state whenever the active course changes
  useEffect(() => {
    setOverflowIdx(0)
    setActiveSlide(0)
    if (trackRef.current) trackRef.current.scrollLeft = 0
  }, [courseId])

  function slideStep(el) {
    const first = el.children[0]
    return first ? first.offsetWidth + 12 : el.clientWidth  // card width + gap
  }
  function handleTrackScroll() {
    if (scrollRAF.current) return
    scrollRAF.current = requestAnimationFrame(() => {
      scrollRAF.current = null
      const el = trackRef.current
      if (!el) return
      const idx = Math.round(el.scrollLeft / slideStep(el))
      setActiveSlide((prev) => (prev !== idx ? idx : prev))
    })
  }
  function goToSlide(i) {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * slideStep(el), behavior: 'smooth' })
    setActiveSlide(i)
  }

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

  // ── Slider preview (what-if, never persisted) ─────────────────────────────
  // previewGrades: { [catId]: number } — overrides real avg while dragging
  const [previewGrades, setPreviewGrades] = useState({})
  const previewTimers = useRef({})

  // Clear all pending preview timers on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      Object.values(previewTimers.current).forEach(clearTimeout)
    }
  }, [])

  function triggerBanner() {
    if (bannerReady) { setShowBanner(true); setBannerReady(false) }
  }

  function handlePreviewChange(catId, val) {
    clearTimeout(previewTimers.current[catId])
    setPreviewGrades((prev) => ({ ...prev, [catId]: val }))
    triggerBanner()
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
  const hasRows      = course.categories.length >= 3
  const gridRows     = hasRows ? '1fr 1fr' : '1fr'
  const heroRowSpan  = hasRows ? '1 / 3' : '1 / 2'

  // ── Mobile carousel slides: categories → letter scale → add (add hidden in demo) ──
  const mobileSlides = [
    ...course.categories.map((cat) => ({ kind: 'cat', cat })),
    { kind: 'scale' },
    ...(isDemo ? [] : [{ kind: 'add' }]),
  ]
  const clampedActive   = Math.min(activeSlide, mobileSlides.length - 1)
  const isPreviewingAny = Object.keys(previewGrades).length > 0

  // ── Demo mutations (local state only, never persisted to Zustand) ────────────
  function demoSetItemGrade(_cid, catId, itemId, grade) {
    triggerBanner()
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
    triggerBanner()
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

  function openModal(id) { triggerBanner(); setOpenCatId(id) }

  function handleDeleteCourse(id) {
    deleteCourse(id)
  }

  // ── Shared header content ────────────────────────────────────────────────────
  const HeaderLeft = (
    <div>
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
    <motion.button
      onClick={() => navigate('/course/new/setup')}
      onMouseEnter={() => setAddCourseHovered(true)}
      onMouseLeave={() => setAddCourseHovered(false)}
      animate={{
        backgroundColor: addCourseHovered ? C.card2 : C.card,
        borderColor: addCourseHovered ? 'rgba(255,255,255,0.22)' : C.border,
      }}
      whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        alignSelf: 'center',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 14px',
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      <motion.span
        animate={{ color: C.white }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12, letterSpacing: '0.06em' }}
      >
        Add Course
      </motion.span>
    </motion.button>
  )

  return (
    // Root: fixed single-viewport on both mobile and desktop (no page scroll)
    <div
      className="flex flex-col h-dvh overflow-hidden"
      style={{ background: C.bg, fontFamily: FONT_SANS }}
    >

      {/* ── Header (shared) ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-end justify-between gap-4"
           style={{ padding: '16px 20px 10px' }}>
        {HeaderLeft}
        {HeaderRight}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on md+)
          Two rows that fit one viewport — no page scroll:
            Row 1  pinned hero (projected grade, always visible)
            Row 2  horizontal swipe carousel of category / scale / add cards
                   with peeking neighbours and accent-tinted page dots.
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-h-0 md:hidden">

        {/* ── Row 1: pinned hero ─────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, height: '38dvh', margin: '0 20px', position: 'relative' }}>
          <GradeHero letter={letter} grade={rounded} />
          <AnimatePresence>
            {isPreviewingAny && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ position: 'absolute', top: 18, right: 20, zIndex: 11, color: C.blue, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 9, letterSpacing: '0.14em' }}
              >
                WHAT-IF PREVIEW
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Row 2: carousel + page dots ────────────────────────────────────── */}
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
          <div
            ref={trackRef}
            onScroll={handleTrackScroll}
            className="gc-carousel"
            style={{
              flex: '1 1 auto', minHeight: 0,
              display: 'flex', gap: 12,
              padding: '0 28px',
              overflowX: 'auto', overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {mobileSlides.map((slide, i) => {
              const active = i === clampedActive
              return (
                <div
                  key={slide.kind === 'cat' ? slide.cat.id : slide.kind}
                  style={{
                    flex: '0 0 min(320px, 84vw)',
                    height: '100%',
                    scrollSnapAlign: 'center',
                    scrollSnapStop: 'always',  // a swipe moves by only one card at a time
                    opacity: active ? 1 : 0.5,
                    transform: `scale(${active ? 1 : 0.965})`,
                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                  }}
                >
                  {slide.kind === 'cat' && (
                    <CategoryCard
                      mobile
                      category={slide.cat}
                      {...actions}
                      onClick={() => openModal(slide.cat.id)}
                      previewValue={previewGrades[slide.cat.id]}
                      onPreviewChange={(val) => handlePreviewChange(slide.cat.id, val)}
                      onPreviewEnd={() => handlePreviewEnd(slide.cat.id)}
                    />
                  )}
                  {slide.kind === 'scale' && (
                    <LetterScale center scale={course.scale} currentGrade={rounded} categories={course.categories} />
                  )}
                  {slide.kind === 'add' && (
                    <motion.button
                      onClick={() => navigate(`/course/${courseId}/setup?addCategory=1`)}
                      whileTap={{ scale: 0.985 }}
                      transition={{ duration: 0.1 }}
                      style={{
                        height: '100%', width: '100%',
                        background: 'transparent',
                        border: `1px dashed ${C.border}`,
                        borderRadius: 14,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 16,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ width: 54, height: 54, borderRadius: '50%', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 300, color: C.dim, lineHeight: 1 }}>+</span>
                      <span style={{ color: C.dim, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 10, letterSpacing: '0.16em' }}>ADD CATEGORY</span>
                    </motion.button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Page dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 30, flexShrink: 0 }}>
            {mobileSlides.map((_slide, i) => {
              const active = i === clampedActive
              return (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to card ${i + 1} of ${mobileSlides.length}`}
                  style={{
                    width: active ? 9 : 7,
                    height: active ? 9 : 7,
                    borderRadius: '50%',
                    background: active ? C.muted : 'rgba(255,255,255,0.22)',
                    border: 'none', padding: 0, cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden on mobile, shown on md+)
          Fixed-height viewport grid — unchanged original layout
      ════════════════════════════════════════════════════════════════════════ */}
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

      {/* ── Demo prompt ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDemo && showPrompt && !promptDismissed && (
          <DemoPrompt
            onDismiss={() => { setShowPrompt(false); setPromptDismissed(true); setBannerReady(true) }}
            onGetStarted={() => navigate('/course/new/setup')}
          />
        )}
      </AnimatePresence>

      {/* ── Item detail modal ────────────────────────────────────────────────── */}
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

      {/* ── Demo banner ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDemo && showBanner && <DemoBanner />}
      </AnimatePresence>
    </div>
  )
}
