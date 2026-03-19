import { motion } from 'framer-motion'
import { toggleHover } from '../utils/hoverPresets'

/**
 * Simple on/off toggle switch.
 * Props: checked, onChange, accentColor
 */
export default function Toggle({ checked, onChange, accentColor = '#3b82f6', label }) {
  return (
    <motion.button
      {...toggleHover}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center flex-shrink-0 w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? accentColor : '#1c3048' }}
    >
      <span
        className="inline-block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </motion.button>
  )
}
