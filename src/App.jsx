import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/AuthContext'
import { ROLES } from './config/roles'
import { AppLayout, RequireAuth, RequireModule, RequireDepartment } from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CommandCenter from './pages/CommandCenter'
import Patients from './pages/Patients'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import DepartmentHub from './pages/DepartmentHub'
import IPD from './pages/IPD'
import Nursing from './pages/Nursing'
import Therapy from './pages/Therapy'
import Pharmacy from './pages/Pharmacy'
import Lab from './pages/Lab'
import Billing from './pages/Billing'
import Tasks from './pages/Tasks'
import Approvals from './pages/Approvals'
import Audit from './pages/Audit'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function LandingRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLES[user.role]?.landing || '/dashboard'} replace />
}

const guarded = (moduleKey, element) => <RequireModule moduleKey={moduleKey}>{element}</RequireModule>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/command-center" element={guarded('commandCenter', <CommandCenter />)} />
        <Route path="/dashboard" element={guarded('dashboard', <Dashboard />)} />
        <Route path="/patients" element={guarded('patients', <Patients />)} />
        <Route path="/appointments" element={guarded('appointments', <Appointments />)} />
        <Route path="/consultations" element={guarded('consultations', <Consultations />)} />
        <Route path="/departments/:code" element={<RequireDepartment><DepartmentHub /></RequireDepartment>} />
        <Route path="/ipd" element={guarded('ipd', <IPD />)} />
        <Route path="/nursing" element={guarded('nursing', <Nursing />)} />
        <Route path="/therapy" element={guarded('therapy', <Therapy />)} />
        <Route path="/pharmacy" element={guarded('pharmacy', <Pharmacy />)} />
        <Route path="/lab" element={guarded('lab', <Lab />)} />
        <Route path="/billing" element={guarded('billing', <Billing />)} />
        <Route path="/tasks" element={guarded('tasks', <Tasks />)} />
        <Route path="/approvals" element={guarded('approvals', <Approvals />)} />
        <Route path="/audit" element={guarded('audit', <Audit />)} />
        <Route path="/reports" element={guarded('reports', <Reports />)} />
        <Route path="/settings" element={guarded('settings', <Settings />)} />
      </Route>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  )
}
