import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { ROLES } from '../config/roles'
import { users as demoUsers } from '../data/seed'
import { BrandWordmark, LeafMark } from '../components/layout/Brand'
import { Field, Input } from '../components/ui/primitives'
import { LogIn, Sparkles } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const res = login(email, password)
    if (!res.ok) return setError(res.error)
    navigate(ROLES[res.user.role]?.landing || '/dashboard')
  }

  const quickFill = (u) => {
    setEmail(u.email)
    setPassword(u.password)
    setError('')
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(216,167,62,0.25), transparent 45%), radial-gradient(circle at 85% 75%, rgba(78,157,120,0.3), transparent 40%)',
          }}
        />
        <div className="relative">
          <BrandWordmark light />
        </div>

        <div className="relative max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold-200">
            <Sparkles size={13} /> NABH Accredited · 61 Years of Healing
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Holistic Healing,
            <br />
            <span className="text-gold-300">Where Ayurveda Meets Modern Medicine.</span>
          </h1>
          <p className="mt-4 text-brand-100/70 leading-relaxed">
            <span className="font-medium text-white">ArogyaFlow</span> — the connected hospital operations platform for Dr. P. Alikutty's Ayurveda &amp; Modern
            Hospital, Kottakkal. Rooted in healing. Built for connected care.
          </p>
        </div>

        <div className="relative flex items-center gap-8 text-sm text-brand-100/60">
          <div>
            <p className="font-display text-2xl text-white">100k+</p>
            <p>Lives improved</p>
          </div>
          <div>
            <p className="font-display text-2xl text-white">10</p>
            <p>Departments</p>
          </div>
          <div>
            <p className="font-display text-2xl text-white">150</p>
            <p>In-patient beds</p>
          </div>
        </div>
      </div>

      {/* Login form */}
      <div className="flex w-full flex-col justify-center bg-cream px-6 py-10 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandWordmark />
          </div>

          <h2 className="font-display text-2xl font-semibold text-brand-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink/50">Sign in to the operations platform.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@palikutty.in"
                autoComplete="username"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full py-2.5">
              <LogIn size={18} /> Sign in
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink/35">
              <span className="h-px flex-1 bg-sand" />
              Demo accounts — tap to fill
              <span className="h-px flex-1 bg-sand" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quickFill(u)}
                  className="group flex flex-col items-start rounded-lg border border-sand bg-white px-3 py-2 text-left transition hover:border-brand-300 hover:shadow-sm"
                >
                  <span className="text-xs font-semibold text-brand-800">
                    {ROLES[u.role]?.label || u.role}
                  </span>
                  <span className="text-[11px] text-ink/40 truncate w-full">{u.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-ink/35">
              Every demo password follows the pattern <code className="text-brand-700">role+123</code> (e.g. admin123, doctor123).
            </p>
          </div>
          <p className="mt-5 text-center text-[11px] text-ink/35">
            ArogyaFlow · Connected Hospital Operations Platform · <span className="text-ink/50">by Elan Iqbal</span>
          </p>
        </div>
      </div>
    </div>
  )
}
