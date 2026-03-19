/**
 * Returns the mean of all active items' grades.
 * Returns 0 if no active items.
 */
export function categoryAverage(items) {
  const active = items.filter((i) => i.active)
  if (active.length === 0) return 0
  const sum = active.reduce((acc, i) => acc + i.grade, 0)
  return sum / active.length
}

/**
 * Computes the overall weighted grade across all categories.
 * Returns a number (not yet rounded).
 */
export function totalGrade(categories) {
  return categories.reduce((acc, cat) => {
    return acc + (categoryAverage(cat.items) * cat.weight) / 100
  }, 0)
}

/**
 * Rounds grade to nearest tenth, then finds the matching letter.
 */
export function getLetter(grade, scale) {
  const rounded = Math.round(grade * 10) / 10
  for (const entry of scale) {
    if (rounded >= entry.min) return entry.grade
  }
  return 'F'
}

/**
 * Determines the color class name based on grade tier.
 */
export function gradeColor(grade) {
  if (grade >= 90) return '#2dd4a8'
  if (grade >= 80) return '#3b82f6'
  if (grade >= 70) return '#eab308'
  if (grade >= 60) return '#f97316'
  return '#f43f5e'
}

/**
 * Back-solves: given all current grades, what score is needed in the target
 * category (by catId) to hit the target letter grade's minimum threshold?
 *
 * Returns a number 0–100, or null if impossible (would require >100 or <0).
 */
export function requiredScore(targetGrade, categories, targetCatId, scale) {
  // Find the minimum numeric threshold for the target letter
  const scaleEntry = scale.find((s) => s.grade === targetGrade)
  if (!scaleEntry) return null
  const targetMin = scaleEntry.min

  // Sum weighted contributions from all OTHER categories
  const otherSum = categories
    .filter((c) => c.id !== targetCatId)
    .reduce((acc, cat) => acc + (categoryAverage(cat.items) * cat.weight) / 100, 0)

  const targetCat = categories.find((c) => c.id === targetCatId)
  if (!targetCat || targetCat.weight === 0) return null

  // targetMin = otherSum + (needed * weight / 100)
  const needed = ((targetMin - otherSum) * 100) / targetCat.weight

  if (needed > 100) return null   // impossible
  if (needed < 0) return 0        // already achieved
  return Math.round(needed * 10) / 10
}

/**
 * Returns true if the sum of all category weights equals exactly 100.
 */
export function validateWeights(categories) {
  const sum = categories.reduce((acc, c) => acc + Number(c.weight), 0)
  return Math.round(sum * 10) / 10 === 100
}

/**
 * Returns total weight sum (for live indicator).
 */
export function totalWeight(categories) {
  return Math.round(categories.reduce((acc, c) => acc + Number(c.weight), 0) * 10) / 10
}

export const DEFAULT_SCALE = [
  { grade: 'A',  min: 93 },
  { grade: 'A-', min: 90 },
  { grade: 'B+', min: 87 },
  { grade: 'B',  min: 83 },
  { grade: 'B-', min: 80 },
  { grade: 'C+', min: 77 },
  { grade: 'C',  min: 73 },
  { grade: 'C-', min: 70 },
  { grade: 'D+', min: 67 },
  { grade: 'D',  min: 60 },
  { grade: 'F',  min: 0  },
]

export const PRESET_TEMPLATES = {
  standard: {
    label: 'Standard',
    description: 'Homework, Quizzes, Midterms, Final',
    categories: [
      { name: 'Homework',  weight: 15, color: 'green',  itemCount: 6 },
      { name: 'Quizzes',   weight: 15, color: 'blue',   itemCount: 6 },
      { name: 'Midterms',  weight: 40, color: 'purple', itemCount: 2 },
      { name: 'Final Exam',weight: 30, color: 'pink',   itemCount: 1 },
    ],
  },
  examHeavy: {
    label: 'Exam-Heavy',
    description: 'Midterm 1, Midterm 2, Final',
    categories: [
      { name: 'Midterm 1', weight: 30, color: 'purple', itemCount: 1 },
      { name: 'Midterm 2', weight: 30, color: 'purple', itemCount: 1 },
      { name: 'Final Exam',weight: 40, color: 'pink',   itemCount: 1 },
    ],
  },
  projectBased: {
    label: 'Project-Based',
    description: 'Assignments, Project, Presentation, Final',
    categories: [
      { name: 'Assignments',   weight: 25, color: 'green',  itemCount: 5 },
      { name: 'Project',       weight: 30, color: 'teal',   itemCount: 1 },
      { name: 'Presentation',  weight: 20, color: 'orange', itemCount: 1 },
      { name: 'Final Exam',    weight: 25, color: 'pink',   itemCount: 1 },
    ],
  },
  custom: {
    label: 'Custom',
    description: 'Start from scratch',
    categories: [],
  },
}

export const ACCENT_COLORS = [
  { key: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { key: 'green',  label: 'Green',  hex: '#2dd4a8' },
  { key: 'purple', label: 'Purple', hex: '#8b5cf6' },
  { key: 'pink',   label: 'Pink',   hex: '#f43f5e' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'yellow', label: 'Yellow', hex: '#eab308' },
  { key: 'teal',   label: 'Teal',   hex: '#06b6d4' },
]

export function colorHex(colorKey) {
  return ACCENT_COLORS.find((c) => c.key === colorKey)?.hex ?? '#3b82f6'
}

// ─── Grade-reactive theme system ─────────────────────────────────────────────
const GRADE_THEMES = {
  A: { primary: '#34d399', secondary: '#10b981', accent: '#2dd4bf' },
  B: { primary: '#38bdf8', secondary: '#3b82f6', accent: '#22d3ee' },
  C: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fcd34d' },
  D: { primary: '#fb923c', secondary: '#f97316', accent: '#fdba74' },
  F: { primary: '#f87171', secondary: '#ef4444', accent: '#dc2626' },
}

export function getGradeTier(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function getGradeTheme(score) {
  return GRADE_THEMES[getGradeTier(score)]
}
