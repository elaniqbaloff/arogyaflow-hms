import { NavLink } from 'react-router-dom'
import { NAV } from '../../config/navigation'
import { canSeeModule, roleLabel } from '../../config/roles'
import { useAuth } from '../../store/AuthContext'
import { BrandWordmark } from './Brand'
import { cx } from '../../lib/utils'
import { LogOut } from 'lucide-react'

export function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth()
  const items = NAV.filter((n) => canSeeModule(user, n.key))

  return (
    <aside className="flex h-full w-64 flex-col bg-brand-900 text-white">
      <div className="px-5 py-5 border-b border-white/10">
        <BrandWordmark light />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-100/50">
          Operations
        </p>
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => cx('nav-link', isActive && 'nav-link-active')}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-[11px] text-brand-100/60">{roleLabel(user?.role)}</p>
        </div>
        <button onClick={logout} className="nav-link w-full text-brand-100/80">
          <LogOut size={18} />
          Sign out
        </button>
        <p className="px-3 pt-3 text-[10px] text-brand-100/40 leading-relaxed">
          NABH-accredited · Kottakkal
          <br />
          Where Ayurveda meets modern medicine
        </p>
      </div>
    </aside>
  )
}
