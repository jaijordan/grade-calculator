import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { C, FONT_SANS } from './tokens'
import { buttonHover } from '../../utils/hoverPresets'

export default function DemoBanner() {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' }}>
      <motion.button
        {...buttonHover}
        onClick={() => navigate('/course/new/setup')}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 22px',
          background: 'rgba(18, 20, 22, 0.82)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          cursor: 'pointer',
          boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: C.white, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12, letterSpacing: '0.06em' }}>
          Save Your Grade
        </span>
        <span style={{ color: C.blue, fontSize: 13 }}>→</span>
      </motion.button>
    </div>
  )
}
