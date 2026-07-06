import { Menu, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useHospital } from '../../store/HospitalContext'
import { useToast } from '../ui/Toast'
import { ROLES, roleLabel } from '../../config/roles'
import { Avatar } from '../ui/primitives'

export function Topbar({ onMenu }) {
  const { user } = useAuth()
  const { reseed } = useHospital()
  const toast = useToast()
  const accent = ROLES[user?.role]?.accent || '#21664c'

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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sand bg-cream/80 px-4 py-3 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-ink/60 hover:bg-sand lg:hidden">
        <Menu size={20} />
      </button>

      <div className="hidden items-center gap-2 text-sm text-ink/50 sm:flex">
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
