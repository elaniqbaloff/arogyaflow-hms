import { Search, Inbox } from 'lucide-react'
import { cx, initials } from '../../lib/utils'

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-1 rounded-xl bg-brand-50 p-2.5 text-brand-700">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-brand-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink/50 mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    gold: 'bg-gold-50 text-gold-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return (
    <div className="card p-5 flex items-start justify-between animate-slide-up">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink/45">{label}</p>
        <p className="text-3xl font-display font-semibold text-brand-900 mt-2 leading-none">
          {value}
        </p>
        {sub && <p className="text-xs text-ink/45 mt-2">{sub}</p>}
      </div>
      {Icon && (
        <div className={cx('rounded-xl p-2.5', tones[tone])}>
          <Icon size={20} />
        </div>
      )}
    </div>
  )
}

const BADGE_TONES = {
  green: 'bg-brand-50 text-brand-700',
  gold: 'bg-gold-50 text-gold-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-600',
}

// Maps any status string to a sensible colour.
const STATUS_MAP = {
  scheduled: 'sky', completed: 'green', cancelled: 'rose', pending: 'gold',
  paid: 'green', partial: 'gold', dispensed: 'green', active: 'green',
  disabled: 'slate', requested: 'gold', 'in-progress': 'sky',
}

export function Badge({ children, tone, status }) {
  const t = tone || STATUS_MAP[status] || 'slate'
  return <span className={cx('badge', BADGE_TONES[t])}>{children || status}</span>
}

export function Field({ label, children, required, hint }) {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-ink/40 mt-1">{hint}</span>}
    </label>
  )
}

export function Input(props) {
  return <input {...props} className={cx('input', props.className)} />
}
export function Textarea(props) {
  return <textarea {...props} className={cx('input min-h-[88px] resize-y', props.className)} />
}
export function Select({ children, ...props }) {
  return (
    <select {...props} className={cx('input appearance-none bg-white', props.className)}>
      {children}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 w-full sm:w-64"
      />
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-2xl bg-sand/60 p-4 text-ink/30">
        <Inbox size={28} />
      </div>
      <p className="mt-4 font-medium text-ink/70">{title}</p>
      {message && <p className="text-sm text-ink/40 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Avatar({ name, accent = '#21664c', size = 36 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white shrink-0"
      style={{ width: size, height: size, background: accent, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

// Grouped form / detail section with a titled divider.
export function Section({ title, icon: Icon, desc, children, tone = 'brand' }) {
  const tones = {
    brand: 'text-brand-700', gold: 'text-gold-600',
    rose: 'text-rose-600', sky: 'text-sky-600',
  }
  return (
    <section className="sm:col-span-2 mt-2 first:mt-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-sand pb-2 mb-3">
        {Icon && <Icon size={16} className={tones[tone] || tones.brand} />}
        <h4 className="text-sm font-semibold text-brand-900">{title}</h4>
        {desc && <span className="text-[11px] text-ink/40">· {desc}</span>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

// Inline notice / safety banner.
export function Alert({ tone = 'gold', icon: Icon, title, children, className }) {
  const tones = {
    gold: 'bg-gold-50 text-gold-800 border-gold-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    brand: 'bg-brand-50 text-brand-800 border-brand-200',
  }
  return (
    <div className={cx('rounded-lg border px-3 py-2.5 text-sm flex gap-2.5', tones[tone] || tones.gold, className)}>
      {Icon && <Icon size={16} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-[13px] opacity-90 mt-0.5 leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}
