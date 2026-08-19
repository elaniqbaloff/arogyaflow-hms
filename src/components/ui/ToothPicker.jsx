import { useState } from 'react'
import { cx } from '../../lib/utils'

// FDI (ISO 3950) notation. Arrays are in on-screen left-to-right order —
// screen-left is the patient's right side, the standard charting convention.
const PERM_UPPER_LEFT = [18, 17, 16, 15, 14, 13, 12, 11]
const PERM_UPPER_RIGHT = [21, 22, 23, 24, 25, 26, 27, 28]
const PERM_LOWER_LEFT = [48, 47, 46, 45, 44, 43, 42, 41]
const PERM_LOWER_RIGHT = [31, 32, 33, 34, 35, 36, 37, 38]

const DECIDUOUS_UPPER_LEFT = [55, 54, 53, 52, 51]
const DECIDUOUS_UPPER_RIGHT = [61, 62, 63, 64, 65]
const DECIDUOUS_LOWER_LEFT = [85, 84, 83, 82, 81]
const DECIDUOUS_LOWER_RIGHT = [71, 72, 73, 74, 75]

// Every valid FDI tooth number, ascending — for pickers that just need a
// single-tooth dropdown rather than the full chart (e.g. one plan item).
export const ALL_FDI_TEETH = [
  ...PERM_UPPER_LEFT, ...PERM_UPPER_RIGHT, ...PERM_LOWER_LEFT, ...PERM_LOWER_RIGHT,
  ...DECIDUOUS_UPPER_LEFT, ...DECIDUOUS_UPPER_RIGHT, ...DECIDUOUS_LOWER_LEFT, ...DECIDUOUS_LOWER_RIGHT,
].sort((a, b) => a - b)

// Multi-select FDI tooth-number picker. `value` is an array of tooth-number
// strings; selection persists across the permanent/deciduous toggle so mixed
// dentition (a child with both adult and baby teeth involved) can be recorded.
export function ToothPicker({ value = [], onChange }) {
  const [deciduous, setDeciduous] = useState(false)
  const selected = new Set(value.map(String))

  const toggle = (n) => {
    const key = String(n)
    onChange(selected.has(key) ? value.filter((v) => String(v) !== key) : [...value, key])
  }

  const upperLeft = deciduous ? DECIDUOUS_UPPER_LEFT : PERM_UPPER_LEFT
  const upperRight = deciduous ? DECIDUOUS_UPPER_RIGHT : PERM_UPPER_RIGHT
  const lowerLeft = deciduous ? DECIDUOUS_LOWER_LEFT : PERM_LOWER_LEFT
  const lowerRight = deciduous ? DECIDUOUS_LOWER_RIGHT : PERM_LOWER_RIGHT

  const Row = ({ left, right }) => (
    <div className="flex items-center gap-1">
      {left.map((n) => <ToothButton key={n} n={n} active={selected.has(String(n))} onClick={() => toggle(n)} />)}
      <span className="mx-1 h-6 w-px shrink-0 bg-sand" />
      {right.map((n) => <ToothButton key={n} n={n} active={selected.has(String(n))} onClick={() => toggle(n)} />)}
    </div>
  )

  return (
    <div className="rounded-lg border border-sand bg-cream/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">FDI tooth chart</p>
        <button
          type="button"
          onClick={() => setDeciduous((d) => !d)}
          className={cx(
            'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
            deciduous ? 'bg-gold-100 text-gold-700' : 'border border-sand bg-white text-ink/50 hover:text-ink/70'
          )}
        >
          {deciduous ? 'Deciduous (baby teeth)' : 'Permanent'}
        </button>
      </div>

      <div className="mt-3 space-y-1.5 overflow-x-auto pb-1">
        <Row left={upperLeft} right={upperRight} />
        <Row left={lowerLeft} right={lowerRight} />
      </div>

      <div className="mt-2 flex min-h-[1.5rem] flex-wrap gap-1">
        {value.length === 0 ? (
          <span className="text-xs text-ink/30">No teeth selected</span>
        ) : (
          value.map((n) => (
            <span key={n} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
              {n}
              <button type="button" onClick={() => toggle(n)} className="text-brand-500 hover:text-brand-800" aria-label={`Remove tooth ${n}`}>×</button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function ToothButton({ n, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums transition',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-sand bg-white text-ink/60 hover:border-brand-300 hover:text-brand-700'
      )}
    >
      {n}
    </button>
  )
}
