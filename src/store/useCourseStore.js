import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SCALE } from '../utils/gradeCalc'

function uuid() {
  return crypto.randomUUID()
}

function makeItems(count, namePrefix) {
  return Array.from({ length: count }, (_, i) => ({
    id: uuid(),
    label: `${namePrefix} ${i + 1}`,
    grade: 85,
    active: true,
  }))
}

function makeCategory({ name, weight, color, itemCount }) {
  return {
    id: uuid(),
    name,
    weight: Number(weight),
    color: color ?? 'blue',
    items: makeItems(itemCount ?? 1, name),
  }
}

const useCourseStore = create(
  persist(
    (set, get) => ({
      courses: {},
      activeCourseId: null,

      setActiveCourse(id) {
        set({ activeCourseId: id })
      },

      addCourse({ name, institution, semester, categories, scale }) {
        const id = uuid()
        const course = {
          id,
          name,
          institution: institution ?? '',
          semester: semester ?? '',
          createdAt: Date.now(),
          scale: scale ?? DEFAULT_SCALE.map((s) => ({ ...s })),
          categories: categories.map(makeCategory),
        }
        set((state) => ({ courses: { ...state.courses, [id]: course }, activeCourseId: id }))
        return id
      },

      deleteCourse(courseId) {
        set((state) => {
          const courses = { ...state.courses }
          delete courses[courseId]
          const remaining = Object.keys(courses)
          const activeCourseId = state.activeCourseId === courseId
            ? (remaining[0] ?? null)
            : state.activeCourseId
          return { courses, activeCourseId }
        })
      },

      duplicateCourse(courseId) {
        const original = get().courses[courseId]
        if (!original) return
        const newId = uuid()
        const clone = JSON.parse(JSON.stringify(original))
        clone.id = newId
        clone.name = `${clone.name} (Copy)`
        clone.createdAt = Date.now()
        clone.categories = clone.categories.map((cat) => ({
          ...cat,
          id: uuid(),
          items: cat.items.map((item) => ({ ...item, id: uuid() })),
        }))
        set((state) => ({ courses: { ...state.courses, [newId]: clone } }))
        return newId
      },

      updateCourseInfo(courseId, fields) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: { ...state.courses[courseId], ...fields },
          },
        }))
      },

      addCategory(courseId, categoryConfig) {
        const cat = makeCategory(categoryConfig)
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: {
              ...state.courses[courseId],
              categories: [...state.courses[courseId].categories, cat],
            },
          },
        }))
      },

      updateCategory(courseId, catId, fields) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: {
              ...state.courses[courseId],
              categories: state.courses[courseId].categories.map((cat) =>
                cat.id === catId ? { ...cat, ...fields } : cat
              ),
            },
          },
        }))
      },

      removeCategory(courseId, catId) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: {
              ...state.courses[courseId],
              categories: state.courses[courseId].categories.filter((cat) => cat.id !== catId),
            },
          },
        }))
      },

      setItemCount(courseId, catId, count) {
        set((state) => {
          const course = state.courses[courseId]
          const cat = course.categories.find((c) => c.id === catId)
          if (!cat) return state
          let items = [...cat.items]
          if (count > items.length) {
            for (let i = items.length; i < count; i++) {
              items.push({ id: uuid(), label: `${cat.name} ${i + 1}`, grade: 85, active: true })
            }
          } else {
            items = items.slice(0, Math.max(1, count))
          }
          return {
            courses: {
              ...state.courses,
              [courseId]: {
                ...course,
                categories: course.categories.map((c) => c.id === catId ? { ...c, items } : c),
              },
            },
          }
        })
      },

      setItemGrade(courseId, catId, itemId, grade) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: {
              ...state.courses[courseId],
              categories: state.courses[courseId].categories.map((cat) =>
                cat.id === catId
                  ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, grade: Math.min(100, Math.max(0, Number(grade))) } : item) }
                  : cat
              ),
            },
          },
        }))
      },

      toggleItem(courseId, catId, itemId) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: {
              ...state.courses[courseId],
              categories: state.courses[courseId].categories.map((cat) =>
                cat.id === catId
                  ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, active: !item.active } : item) }
                  : cat
              ),
            },
          },
        }))
      },

      addItem(courseId, catId) {
        set((state) => {
          const course = state.courses[courseId]
          if (!course) return state
          const cat = course.categories.find((c) => c.id === catId)
          if (!cat) return state
          const newItem = { id: uuid(), label: 'New Item', grade: 85, active: true }
          return {
            courses: {
              ...state.courses,
              [courseId]: {
                ...course,
                categories: course.categories.map((c) =>
                  c.id === catId ? { ...c, items: [...c.items, newItem] } : c
                ),
              },
            },
          }
        })
      },

      deleteItem(courseId, catId, itemId) {
        set((state) => {
          const course = state.courses[courseId]
          if (!course) return state
          const cat = course.categories.find((c) => c.id === catId)
          if (!cat || cat.items.length <= 1) return state
          return {
            courses: {
              ...state.courses,
              [courseId]: {
                ...course,
                categories: course.categories.map((c) =>
                  c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
                ),
              },
            },
          }
        })
      },

      renameItem(courseId, catId, itemId, label) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: {
              ...state.courses[courseId],
              categories: state.courses[courseId].categories.map((cat) =>
                cat.id === catId
                  ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, label } : item) }
                  : cat
              ),
            },
          },
        }))
      },

      updateScale(courseId, scale) {
        set((state) => ({
          courses: {
            ...state.courses,
            [courseId]: { ...state.courses[courseId], scale },
          },
        }))
      },

      importCourses(importedCourses) {
        set((state) => ({ courses: { ...state.courses, ...importedCourses } }))
      },

      seedDefaultCourse() {
        if (Object.keys(get().courses).length > 0) return
        const id = uuid()
        const hw = [95, 97, 92, 98, 94, 96]
        const qz = [88, 85, 92, 84, 90, 87]
        const course = {
          id,
          name: 'MTH 141',
          institution: 'University at Buffalo',
          semester: 'Spring 2026',
          createdAt: Date.now(),
          scale: DEFAULT_SCALE.map((s) => ({ ...s })),
          categories: [
            {
              id: uuid(), name: 'Homework', weight: 15, color: 'green',
              items: hw.map((g, i) => ({ id: uuid(), label: `HW ${i + 1}`, grade: g, active: true })),
            },
            {
              id: uuid(), name: 'Quizzes', weight: 15, color: 'blue',
              items: qz.map((g, i) => ({ id: uuid(), label: `Quiz ${i + 1}`, grade: g, active: true })),
            },
            {
              id: uuid(), name: 'Exams 1 & 2', weight: 40, color: 'purple',
              items: [
                { id: uuid(), label: 'Exam 1', grade: 82, active: true },
                { id: uuid(), label: 'Exam 2', grade: 82, active: true },
              ],
            },
            {
              id: uuid(), name: 'Final Exam', weight: 30, color: 'pink',
              items: [{ id: uuid(), label: 'Final Exam', grade: 75, active: true }],
            },
          ],
        }
        set((state) => ({ courses: { ...state.courses, [id]: course } }))
      },

      // Smart merge: preserve existing item grades, only rebuild what changed
      mergeCourseCategories(courseId, formCategories) {
        set((state) => {
          const course = state.courses[courseId]
          if (!course) return state
          const existingById = Object.fromEntries(course.categories.map((c) => [c.id, c]))
          const newCategories = formCategories.map((fc) => {
            if (fc.id.startsWith('temp-')) {
              return makeCategory({ name: fc.name, weight: fc.weight, color: fc.color, itemCount: fc.itemCount })
            }
            const existing = existingById[fc.id]
            if (!existing) {
              return makeCategory({ name: fc.name, weight: fc.weight, color: fc.color, itemCount: fc.itemCount })
            }
            let items = [...existing.items]
            const targetCount = parseInt(fc.itemCount, 10) || 1
            if (items.length < targetCount) {
              for (let i = items.length; i < targetCount; i++) {
                items.push({ id: uuid(), label: `${fc.name} ${i + 1}`, grade: 85, active: true })
              }
            } else {
              items = items.slice(0, targetCount)
            }
            return { ...existing, name: fc.name, weight: Number(fc.weight), color: fc.color, items }
          })
          return {
            courses: {
              ...state.courses,
              [courseId]: { ...course, categories: newCategories },
            },
          }
        })
      },
    }),
    { name: 'grade-calculator-v2' }
  )
)

export default useCourseStore
