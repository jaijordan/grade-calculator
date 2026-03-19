import { useMemo } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CourseSetup from './features/setup/CourseSetup'
import Calculator from './features/calculator/Calculator'

function Gateway() {
  const hasCourses = useMemo(() => {
    try {
      const raw = localStorage.getItem('grade-calculator-v2')
      const parsed = JSON.parse(raw)
      return !!(parsed?.state?.courses && Object.keys(parsed.state.courses).length > 0)
    } catch {
      return false
    }
  }, [])

  return <Navigate to={hasCourses ? '/main' : '/demo'} replace />
}

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#070809' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Gateway />} />
          <Route path="/demo" element={<Calculator />} />
          <Route path="/main" element={<Calculator />} />
          <Route path="/course/new/setup" element={<CourseSetup />} />
          <Route path="/course/:id/setup" element={<CourseSetup />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
