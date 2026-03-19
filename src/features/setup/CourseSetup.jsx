import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import useCourseStore from '../../store/useCourseStore'
import { DEFAULT_SCALE, PRESET_TEMPLATES, ACCENT_COLORS, colorHex, totalWeight, validateWeights } from '../../utils/gradeCalc'

// ─── Design tokens (matches Calculator.jsx) ──────────────────────────────────
const S = {
  bg:      '#070809',
  panel:   '#121416',
  surface: '#191b1e',
  border:  'rgba(255,255,255,0.10)',
  muted:   '#7a7e86',
  dim:     '#494d56',
  white:   '#ffffff',
  blue:    '#38BDF8',
  red:     '#f43f5e',
  green:   '#2dd4a8',
}
const FONT_SANS = '"Inter", sans-serif'
const FONT_MONO = '"JetBrains Mono", monospace'

const COLOR_OPTIONS = ACCENT_COLORS

export default function CourseSetup() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'
  const categoriesSectionRef = useRef(null)

  const { courses, addCourse, updateCourseInfo, mergeCourseCategories, updateScale } = useCourseStore()

  const existingCourse = !isNew ? courses[id] : null

  const [name, setName] = useState(existingCourse?.name ?? '')
  const [institution, setInstitution] = useState(existingCourse?.institution ?? '')
  const [semester, setSemester] = useState(existingCourse?.semester ?? '')
  const [categories, setCategories] = useState(() => {
    if (existingCourse) {
      return existingCourse.categories.map((c) => ({
        id: c.id,
        name: c.name,
        weight: String(c.weight),
        color: c.color,
        itemCount: String(c.items.length),
      }))
    }
    return []
  })
  const [scale, setScale] = useState(() =>
    existingCourse ? existingCourse.scale.map((s) => ({ ...s })) : DEFAULT_SCALE.map((s) => ({ ...s }))
  )
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showScaleEditor, setShowScaleEditor] = useState(false)
  const [errors, setErrors] = useState({})

  // Auto-add a category and scroll to section when navigated from the mobile "Add Category" tile
  useEffect(() => {
    if (searchParams.get('addCategory') === '1') {
      addCategory()
      setTimeout(() => {
        categoriesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyTemplate(key) {
    setSelectedTemplate(key)
    const tpl = PRESET_TEMPLATES[key]
    if (tpl.categories.length > 0) {
      setCategories(
        tpl.categories.map((c, i) => ({
          id: `temp-${i}`,
          name: c.name,
          weight: String(c.weight),
          color: c.color,
          itemCount: String(c.itemCount),
        }))
      )
    } else {
      setCategories([])
    }
  }

  function addCategory() {
    setCategories((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, name: '', weight: '0', color: 'blue', itemCount: '1' },
    ])
  }

  function removeCategory(idx) {
    setCategories((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateCat(idx, field, value) {
    setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const weightSum   = categories.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0)
  const weightValid = Math.round(weightSum * 10) / 10 === 100

  const scaleOrdered = scale.every((entry, idx) => idx === 0 || entry.min < scale[idx - 1].min)
  const scaleNoDupes = new Set(scale.map((s) => s.grade.trim().toLowerCase())).size === scale.length
  const scaleInRange = scale.every((s) => s.min >= 0 && s.min <= 100)
  const scaleValid   = scaleOrdered && scaleNoDupes && scaleInRange
  const scaleError   = !scaleOrdered ? 'Minimums must be strictly decreasing (highest grade first)'
    : !scaleNoDupes ? 'Duplicate grade labels found'
    : !scaleInRange ? 'All minimums must be between 0 and 100'
    : null

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Course name is required'
    if (categories.length === 0) errs.categories = 'Add at least one grading category'
    categories.forEach((c, i) => {
      if (!c.name.trim()) errs[`cat_name_${i}`] = 'Name required'
      if (!c.weight || isNaN(parseFloat(c.weight))) errs[`cat_weight_${i}`] = 'Weight required'
    })
    if (!weightValid) errs.weights = `Weights must sum to 100% (currently ${Math.round(weightSum * 10) / 10}%)`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const catConfig = categories.map((c) => ({
      name: c.name.trim(),
      weight: parseFloat(c.weight),
      color: c.color,
      itemCount: parseInt(c.itemCount, 10) || 1,
    }))
    if (isNew) {
      addCourse({ name: name.trim(), institution: institution.trim(), semester: semester.trim(), categories: catConfig, scale })
      navigate('/main')
    } else {
      updateCourseInfo(id, { name: name.trim(), institution: institution.trim(), semester: semester.trim() })
      mergeCourseCategories(id, categories)
      updateScale(id, scale)
      navigate('/main')
    }
  }

  function updateScaleEntry(idx, field, value) {
    setScale((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: field === 'grade' ? value : Number(value) } : s)))
  }

  const weightColor = weightValid ? S.green : Math.abs(weightSum - 100) < 5 ? '#eab308' : S.red

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: S.bg,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '160px 160px',
        backgroundAttachment: 'fixed',
        fontFamily: FONT_SANS,
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* ── Header ── */}
        <div style={{ paddingTop: 40, paddingBottom: 32 }}>
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/main')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: S.dim,
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.1em',
              padding: 0,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            className="setup-back-btn"
          >
            ← BACK
          </button>
          <div style={{ color: S.white, fontWeight: 900, fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            {isNew ? 'NEW' : 'EDIT'}
          </div>
          <div style={{ color: S.white, fontWeight: 900, fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 0.9, letterSpacing: '-0.02em', marginBottom: 10 }}>
            COURSE
          </div>
          <p style={{ color: S.muted, fontSize: 12, marginTop: 8 }}>
            {isNew ? 'Set up your grading structure' : 'Modify course configuration'}
          </p>
        </div>

        {/* ── Course Info ── */}
        <Panel title="COURSE INFO">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Course Name *" error={errors.name}>
              <input
                type="text"
                placeholder="e.g. MTH 141"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle(!!errors.name)}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Institution">
                <input
                  type="text"
                  placeholder="University at Buffalo"
                  maxLength={100}
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  style={inputStyle(false)}
                />
              </Field>
              <Field label="Semester">
                <input
                  type="text"
                  placeholder="Spring 2026"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  style={inputStyle(false)}
                />
              </Field>
            </div>
          </div>
        </Panel>

        {/* ── Templates (new courses only) ── */}
        {isNew && (
          <Panel title="START WITH A TEMPLATE">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(PRESET_TEMPLATES).map(([key, tpl]) => {
                const active = selectedTemplate === key
                return (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      backgroundColor: active ? `${S.blue}18` : S.surface,
                      border: `1px solid ${active ? `${S.blue}60` : S.border}`,
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                  >
                    <p style={{ color: S.white, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12, margin: '0 0 3px' }}>{tpl.label}</p>
                    <p style={{ color: S.muted, fontFamily: FONT_SANS, fontSize: 11, margin: 0 }}>{tpl.description}</p>
                  </button>
                )
              })}
            </div>
          </Panel>
        )}

        {/* ── Grading Categories ── */}
        <div ref={categoriesSectionRef}>
          <Panel title="GRADING CATEGORIES">
            {/* Weight indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderRadius: 10,
              marginBottom: 14,
              backgroundColor: `${weightColor}14`,
              border: `1px solid ${weightColor}44`,
            }}>
              <span style={{ color: weightColor, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 11 }}>
                {weightValid ? '✓ WEIGHTS VALID' : `WEIGHTS SUM TO ${Math.round(weightSum * 10) / 10}% — MUST BE 100%`}
              </span>
              <span style={{ color: weightColor, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11 }}>
                {Math.round(weightSum * 10) / 10} / 100%
              </span>
            </div>

            {errors.weights && <p style={{ color: S.red, fontSize: 11, marginBottom: 10 }}>{errors.weights}</p>}
            {errors.categories && <p style={{ color: S.red, fontSize: 11, marginBottom: 10 }}>{errors.categories}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence initial={false}>
                {categories.map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <CategoryRow
                      cat={cat}
                      idx={idx}
                      errors={errors}
                      onChange={(field, val) => updateCat(idx, field, val)}
                      onRemove={() => removeCategory(idx)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={addCategory}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '12px 0',
                borderRadius: 10,
                backgroundColor: 'transparent',
                border: `1px dashed ${S.border}`,
                color: S.muted,
                fontFamily: FONT_SANS,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.1em',
                cursor: 'pointer',
            }}
            className="setup-add-category-btn"
          >
              + ADD CATEGORY
            </button>
          </Panel>
        </div>

        {/* ── Letter Grade Scale ── */}
        <Panel title="LETTER GRADE SCALE">
          <button
            onClick={() => setShowScaleEditor((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 14px',
              borderRadius: 10,
              backgroundColor: S.surface,
              border: `1px solid ${S.border}`,
              color: S.muted,
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            <span>{showScaleEditor ? 'HIDE SCALE EDITOR' : 'EDIT LETTER SCALE'}</span>
            <span style={{ fontSize: 9 }}>{showScaleEditor ? '▲' : '▼'}</span>
          </button>

          {showScaleEditor && (
            <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${S.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 14px', backgroundColor: S.surface, color: S.dim, fontFamily: FONT_SANS, fontWeight: 900, fontSize: 10, letterSpacing: '0.1em' }}>
                <span>GRADE</span>
                <span>MIN %</span>
                <span />
              </div>
              {scale.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    padding: '8px 14px',
                    alignItems: 'center',
                    borderTop: idx > 0 ? `1px solid ${S.border}` : 'none',
                    backgroundColor: S.surface,
                  }}
                >
                  <input
                    type="text"
                    value={entry.grade}
                    onChange={(e) => updateScaleEntry(idx, 'grade', e.target.value)}
                    style={{ ...inputStyle(false), padding: '5px 8px', fontSize: 12, width: 60 }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={entry.min}
                    onChange={(e) => updateScaleEntry(idx, 'min', e.target.value)}
                    style={{ ...inputStyle(false), padding: '5px 8px', fontSize: 12, width: 76, fontFamily: FONT_MONO }}
                  />
                  <span style={{ color: S.dim, fontFamily: FONT_MONO, fontSize: 11 }}>
                    – {idx + 1 < scale.length ? scale[idx + 1]?.min - 0.1 : 100}
                  </span>
                </div>
              ))}
            </div>
          )}

          {scaleError && <p style={{ color: S.red, fontSize: 11, marginTop: 8 }}>{scaleError}</p>}

          {!showScaleEditor && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 32, rowGap: 6, padding: '0 2px' }}>
              {scale.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: S.white, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12, minWidth: 32 }}>{entry.grade}</span>
                  <span style={{ color: S.muted, fontFamily: FONT_MONO, fontSize: 11 }}>
                    {entry.min}{idx + 1 < scale.length ? ` – ${(scale[idx + 1]?.min - 0.1).toFixed(1)}` : ' – 100'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Save ── */}
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={!weightValid || !scaleValid}
            style={{
              width: '100%',
              padding: '16px 0',
              borderRadius: 14,
              border: 'none',
              backgroundColor: weightValid && scaleValid ? S.blue : 'rgba(255,255,255,0.06)',
              color: weightValid && scaleValid ? S.white : S.dim,
              fontFamily: FONT_SANS,
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: '0.14em',
              cursor: weightValid && scaleValid ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
          >
            {isNew ? 'CREATE COURSE →' : 'SAVE CHANGES →'}
          </button>
          {!weightValid && categories.length > 0 && (
            <p style={{ color: S.dim, fontSize: 11, textAlign: 'center', marginTop: 8 }}>Fix category weights before saving</p>
          )}
          {!scaleValid && (
            <p style={{ color: S.dim, fontSize: 11, textAlign: 'center', marginTop: 8 }}>Fix the letter grade scale before saving</p>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
function inputStyle(hasError) {
  return {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasError ? '#f43f5e' : 'rgba(255,255,255,0.10)'}`,
    color: '#ffffff',
    fontFamily: '"Inter", sans-serif',
    fontWeight: 600,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
}

// ─── Panel (replaces Section) ─────────────────────────────────────────────────
function Panel({ title, children }) {
  return (
    <div style={{
      marginBottom: 12,
      backgroundColor: '#121416',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 16,
      padding: '18px 20px',
    }}>
      <div style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.14em',
        color: '#494d56',
        marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontFamily: '"Inter", sans-serif',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#7a7e86',
        marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
      {error && <p style={{ color: '#f43f5e', fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────
function CategoryRow({ cat, idx, errors, onChange, onRemove }) {
  const accent = colorHex(cat.color)
  const FONT_SANS = '"Inter", sans-serif'
  const FONT_MONO = '"JetBrains Mono", monospace'

  return (
    <div style={{
      borderRadius: 12,
      padding: '14px 14px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.10)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Color picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 4, flexShrink: 0 }}>
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => onChange('color', c.key)}
              title={c.label}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: 'none',
                cursor: 'pointer',
                outline: cat.color === c.key ? `2px solid ${c.hex}` : 'none',
                outlineOffset: 2,
                padding: 0,
                transition: 'transform 0.12s',
              }}
              className="setup-color-dot"
            />
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: 8 }}>
            {/* Name */}
            <input
              type="text"
              placeholder="Category name"
              value={cat.name}
              onChange={(e) => onChange('name', e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${errors[`cat_name_${idx}`] ? '#f43f5e' : 'rgba(255,255,255,0.10)'}`,
                color: '#ffffff',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 12,
                outline: 'none',
              }}
            />
            {/* Weight */}
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={cat.weight}
                onChange={(e) => onChange('weight', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 20px 8px 10px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${errors[`cat_weight_${idx}`] ? '#f43f5e' : 'rgba(255,255,255,0.10)'}`,
                  color: '#ffffff',
                  fontFamily: FONT_MONO,
                  fontWeight: 700,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#494d56', fontSize: 10, fontWeight: 700 }}>%</span>
            </div>
            {/* Item count */}
            <input
              type="number"
              min={1}
              max={50}
              placeholder="1"
              value={cat.itemCount}
              onChange={(e) => onChange('itemCount', e.target.value)}
              title="Number of items"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#ffffff',
                fontFamily: FONT_MONO,
                fontWeight: 700,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
              <span style={{ color: '#7a7e86', fontFamily: FONT_SANS, fontWeight: 700 }}>{cat.weight}% weight</span>
              <span style={{ color: '#494d56' }}>·</span>
              <span style={{ color: '#7a7e86', fontFamily: FONT_SANS }}>{cat.itemCount || 1} item{parseInt(cat.itemCount, 10) !== 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={onRemove}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#494d56',
                fontFamily: FONT_SANS,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.08em',
                padding: 0,
                transition: 'color 0.15s',
              }}
              className="setup-remove-btn"
            >
              REMOVE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
