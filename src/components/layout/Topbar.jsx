import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, RefreshCw, ShieldCheck, Search, User2 } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useHospital } from '../../store/HospitalContext'
import { useToast } from '../ui/Toast'
import { ROLES, roleLabel, canSeeModule } from '../../config/roles'
import { NAV } from '../../config/navigation'
import { Avatar } from '../ui/primitives'
import { cx } from '../../lib/utils'

export function Topbar({ onMenu }) {
  const { user } = useAuth()
  const { state, reseed } = useHospital()
  const toast = useToast()
  const navigate = useNavigate()
  const accent = ROLES[user?.role]?.accent || '#21664c'

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)
  const desktopInputRef = useRef(null)
  const mobileInputRef = useRef(null)

  const handleReset = () => {
    if (
      window.confirm(
        'Reset all demo data back to the original seed? This clears any records you added.'
      )
    ) {
      reseed()
      toast('Demo data reset to original seed.', 'info')
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const patients = (state.patients || [])
      .filter((p) => p.status !== 'archived')
      .filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.mrn?.toLowerCase().includes(q) ||
        (p.phone || '').includes(q)
      )
      .slice(0, 8)
      .map((p) => ({
        kind: 'patient', key: `p_${p.id}`, label: p.name,
        sub: `${p.mrn} · ${p.phone || 'No phone'}`, to: `/patients?q=${encodeURIComponent(p.mrn)}`,
      }))
    const modules = NAV
      .filter((n) => canSeeModule(user, n.key) && n.label.toLowerCase().includes(q))
      .map((n) => ({ kind: 'module', key: `m_${n.key}`, label: n.label, sub: 'Go to module', to: n.to, icon: n.icon }))
    return [...patients, ...modules]
  }, [state.patients, user, query])

  useEffect(() => setActiveIndex(0), [query])

  // `/` focuses search, unless the user is already typing somewhere else.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      e.preventDefault()
      if (window.innerWidth < 640) {
        setMobileOpen(true)
        requestAnimationFrame(() => mobileInputRef.current?.focus())
      } else {
        desktopInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const goTo = (result) => {
    navigate(result.to)
    setQuery('')
    setOpen(false)
    setMobileOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setMobileOpen(false)
      e.currentTarget.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (r) goTo(r)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sand bg-cream/80 px-4 py-3 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-ink/60 hover:bg-sand lg:hidden">
        <Menu size={20} />
      </button>

      <div ref={containerRef} className="relative flex-1 max-w-md">
        {/* Desktop / tablet: inline search box, replaces the static tagline. */}
        <div className="hidden sm:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
            <input
              ref={desktopInputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search patients or go to… ( / )"
              className="input pl-9 w-full"
            />
          </div>
          {open && query.trim() && (
            <SearchResults results={results} activeIndex={activeIndex} onPick={goTo} />
          )}
        </div>

        {/* Mobile: collapses to an icon; tapping it reveals the same input as an overlay. */}
        <div className="sm:hidden">
          <button
            onClick={() => { setMobileOpen((v) => !v); requestAnimationFrame(() => mobileInputRef.current?.focus()) }}
            className="rounded-lg p-2 text-ink/60 hover:bg-sand"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          {mobileOpen && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
                <input
                  ref={mobileInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search patients or go to…"
                  className="input pl-9 w-full"
                />
              </div>
              {query.trim() && <SearchResults results={results} activeIndex={activeIndex} onPick={goTo} />}
            </div>
          )}
        </div>
      </div>

      <div className="hidden items-center gap-2 text-sm text-ink/50 lg:flex">
        <ShieldCheck size={16} className="text-brand-500" />
        <span>Internal Operations Platform</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleReset}
          className="btn-outline btn-sm"
          title="Reset demo data"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Reset demo</span>
        </button>
        <div
          className="badge"
          style={{ background: `${accent}14`, color: accent }}
        >
          {roleLabel(user?.role)}
        </div>
        <Avatar name={user?.name} accent={accent} />
      </div>
    </header>
  )
}

function SearchResults({ results, activeIndex, onPick }) {
  return (
    <div className="card shadow-lift absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto py-1.5">
      {results.length === 0 ? (
        <p className="px-4 py-3 text-sm text-ink/40">No matches.</p>
      ) : (
        results.map((r, i) => (
          <button
            key={r.key}
            onMouseDown={(e) => { e.preventDefault(); onPick(r) }}
            className={cx(
              'flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm',
              i === activeIndex ? 'bg-cream/80' : 'hover:bg-cream/60'
            )}
          >
            {r.kind === 'module' && r.icon && <r.icon size={15} className="text-brand-600 shrink-0" />}
            {r.kind === 'patient' && <User2 size={15} className="text-brand-600 shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-brand-900">{r.label}</span>
              <span className="block truncate text-xs text-ink/40">{r.sub}</span>
            </span>
          </button>
        ))
      )}
    </div>
  )
}
