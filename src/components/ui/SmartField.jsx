import { useEffect, useRef, useState } from 'react'
import { useHospital } from '../../store/HospitalContext'
import { useAuth } from '../../store/AuthContext'
import { suggest } from '../../services/smartAssist'
import { Badge, Input } from './primitives'
import { cx } from '../../lib/utils'

const DEBOUNCE_MS = 120

// The "current fragment" is the text since the last comma/newline before the
// caret — the span suggestions are matched against and the span an
// insertion replaces, so autocompleting one item in a comma-separated list
// (or one line of a multi-line field) doesn't touch anything typed earlier.
function currentFragment(value, caret) {
  const before = value.slice(0, caret)
  const lastBreak = Math.max(before.lastIndexOf(','), before.lastIndexOf('\n'))
  const rawStart = lastBreak + 1
  const raw = before.slice(rawStart)
  const leadingWs = raw.length - raw.replace(/^\s+/, '').length
  return { start: rawStart + leadingWs, end: caret, text: raw.trim() }
}

// Wraps Input/Textarea (pass `as={Textarea}` for multi-line fields) with
// clinical-term autocomplete. Fully transparent when the dropdown is
// closed — same value/onChange contract as the plain primitive, and it
// never mutates the field on blur, only on an explicit pick.
export function SmartField({ as: Field = Input, fieldKey, departmentCode, value, onChange, onBlur, className, ...rest }) {
  const { state } = useHospital()
  const { user } = useAuth()
  const elRef = useRef(null)
  const debounceRef = useRef(null)
  const fragmentRef = useRef({ start: 0, end: 0, text: '' })
  const pendingCaretRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // Runs after every commit (no dep array) so a caret position queued by an
  // insertion is restored right after React syncs the new `value` into the
  // DOM — a native `.value` assignment otherwise leaves the caret at the end.
  useEffect(() => {
    if (pendingCaretRef.current == null) return
    const caret = pendingCaretRef.current
    pendingCaretRef.current = null
    const el = elRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(caret, caret)
    }
  })

  const close = () => {
    setOpen(false)
    setResults([])
    setActiveIndex(0)
  }

  const queryAt = (text, caret) => {
    const frag = currentFragment(text, caret)
    fragmentRef.current = frag
    clearTimeout(debounceRef.current)
    if (frag.text.length < 2) {
      close()
      return
    }
    debounceRef.current = setTimeout(() => {
      const found = suggest(frag.text, { state, user, departmentCode, fieldKey })
      if (found.length > 0) {
        setResults(found)
        setActiveIndex(0)
        setOpen(true)
      } else {
        close()
      }
    }, DEBOUNCE_MS)
  }

  const handleChange = (e) => {
    onChange?.(e)
    // Read straight off the DOM event, not the (still-stale-until-re-render)
    // `value` prop, so the fragment reflects the keystroke that just happened.
    const caret = e.target.selectionStart ?? e.target.value.length
    queryAt(e.target.value, caret)
  }

  const insertResult = (result) => {
    const { start, end } = fragmentRef.current
    const val = value ?? ''
    const text = result.templateText || result.term
    const before = val.slice(0, start)
    const after = val.slice(end)
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before)
    const insertText = (needsLeadingSpace ? ' ' : '') + text
    const nextValue = before + insertText + after
    const nextCaret = before.length + insertText.length

    pendingCaretRef.current = nextCaret
    onChange?.({ target: { value: nextValue, name: rest.name } })
    close()
  }

  const handleKeyDown = (e) => {
    rest.onKeyDown?.(e)
    if (!open || e.defaultPrevented) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const picked = results[activeIndex]
      if (picked) {
        e.preventDefault()
        insertResult(picked)
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return (
    <div className="relative">
      <Field
        ref={elRef}
        value={value}
        onChange={handleChange}
        className={className}
        {...rest}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          // Never insert on blur — just close the dropdown.
          onBlur?.(e)
          close()
        }}
      />
      {open && results.length > 0 && (
        <div className="card shadow-lift absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto py-1">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault() // keep focus on the field so blur doesn't fire before the click
                insertResult(r)
              }}
              className={cx(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                i === activeIndex ? 'bg-cream/80' : 'hover:bg-cream/60'
              )}
            >
              <span className="flex-1 truncate text-ink/80">{r.term}</span>
              <Badge tone="slate">{r.category}</Badge>
              {r.templateText && <Badge tone="gold">template</Badge>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
