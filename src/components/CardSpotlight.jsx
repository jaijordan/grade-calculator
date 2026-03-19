import { useMotionValue, useSpring, motion } from 'framer-motion'

/**
 * useCardSpotlight — cursor-following spotlight hook.
 * Call once per card component; spread the returned handlers onto the card's
 * outer div and pass spotX/spotY into <CardSpotlight />.
 *
 * Spring config: high stiffness (300) so the glow tracks the cursor tightly
 * across the grid with minimal lag.
 */
export function useCardSpotlight() {
  const mouseX = useMotionValue(-200)
  const mouseY = useMotionValue(-200)

  const spotX = useSpring(mouseX, { damping: 20, stiffness: 300 })
  const spotY = useSpring(mouseY, { damping: 20, stiffness: 300 })

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  function handleMouseLeave() {
    // Move offscreen so the spring carries it out of the clipped card area
    // naturally — avoids a snap-to-center flash.
    mouseX.set(-200)
    mouseY.set(-200)
  }

  return { spotX, spotY, handleMouseMove, handleMouseLeave }
}

/**
 * CardSpotlight — absolutely-positioned radial glow that follows spotX/spotY.
 * Must be rendered inside a parent with:
 *   position: relative  (to establish stacking context)
 *   overflow: hidden    (to clip the spotlight at card boundaries)
 *
 * All content siblings should have position: relative + zIndex above 0.
 */
export function CardSpotlight({ spotX, spotY, color = 'rgba(255, 255, 255, 0.06)', size = 350 }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        borderRadius: '50%',
        width: size,
        height: size,
        filter: 'blur(80px)',
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        left: spotX,
        top: spotY,
        x: '-50%',
        y: '-50%',
      }}
    />
  )
}
