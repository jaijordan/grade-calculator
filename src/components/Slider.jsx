/**
 * Reusable range slider. Track fills with #38BDF8; thumb styled by global CSS.
 */
export default function Slider({ value, onChange, min = 0, max = 100, step = 1, disabled = false, label }) {
  const pct = ((value - min) / (max - min)) * 100
  const trackBg = `linear-gradient(to right, rgba(255,255,255,0.22) ${pct}%, rgba(255,255,255,0.07) ${pct}%)`

  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={`${value}%`}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: trackBg }}
        className={`w-full ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
      />
    </div>
  )
}
