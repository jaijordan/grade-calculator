/**
 * Reusable Framer Motion hover/tap animation presets.
 *
 * Rules:
 *  - Scale values are intentionally small — felt more than seen.
 *  - whileTap always goes slightly below 1.0 for tactile press feedback.
 *  - Spread onto motion.* elements: <motion.button {...buttonHover} ...>
 */

// Standard pill buttons and call-to-action buttons
export const buttonHover = {
  whileHover: { scale: 1.04, transition: { duration: 0.15 } },
  whileTap:   { scale: 0.97, transition: { duration: 0.08 } },
}

// Click-to-edit numeric values
export const valueHover = {
  whileHover: {
    scale: 1.06,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transition: { duration: 0.12 },
  },
  whileTap: { scale: 0.98, transition: { duration: 0.06 } },
}

// Toggle switches
export const toggleHover = {
  whileHover: { scale: 1.1,  transition: { duration: 0.12 } },
  whileTap:   { scale: 0.95, transition: { duration: 0.06 } },
}

// Small ± item-count controls
export const controlHover = {
  whileHover: {
    scale: 1.12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transition: { duration: 0.1 },
  },
  whileTap: { scale: 0.9, transition: { duration: 0.06 } },
}

// Navigation / text links
export const linkHover = {
  whileHover: { opacity: 1, x: 2, transition: { duration: 0.15 } },
}
