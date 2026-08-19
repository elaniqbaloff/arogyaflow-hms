import { useState } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '../../store/AuthContext'
import { useHospital } from '../../store/HospitalContext'
import { canSeeModule } from '../../config/roles'
import { userDepartmentCode } from '../../services/accessPolicy'

export function AppLayout() {
  const [drawer, setDrawer] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden app-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full animate-fade-in">
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AccessRestricted({ message, path }) {
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <h2 className="text-xl font-semibold text-brand-900">Access restricted</h2>
      <p className="mt-2 text-sm text-ink/50">{message}</p>
      <p className="mt-1 text-xs text-ink/30">Requested: {path}</p>
    </div>
  )
}

// Guards a route by module key; bounces to the role's landing page.
export function RequireModule({ moduleKey, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  if (!canSeeModule(user, moduleKey)) {
    return (
      <AccessRestricted
        path={location.pathname}
        message="Your role doesn't have access to this module. If you believe this is a mistake, contact your system administrator."
      />
    )
  }
  return children
}

// Guards a route by the :code department param — the user's own department
// must match, or they're admin/management (mirrors accessPolicy's rules).
export function RequireDepartment({ children }) {
  const { user } = useAuth()
  const { state } = useHospital()
  const { code } = useParams()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  const isManager = user.role === 'admin' || user.role === 'management'
  const authorized = isManager || userDepartmentCode(user, state) === code
  if (!authorized) {
    return (
      <AccessRestricted
        path={location.pathname}
        message="Your department doesn't have access to this hub. If you believe this is a mistake, contact your system administrator."
      />
    )
  }
  return children
}
