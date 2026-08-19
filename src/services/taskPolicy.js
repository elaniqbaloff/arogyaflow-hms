// ─────────────────────────────────────────────────────────────
// Task visibility & action policy — the single source of truth for
// who can see and act on a task, so pages don't scatter ad-hoc role
// checks. Pure functions; no state, no dispatch.
// ─────────────────────────────────────────────────────────────

import { can } from '../config/roles'
import { ROLE_DEPARTMENT } from './workflow'

const isManager = (user) => user?.role === 'admin' || user?.role === 'management'
const userDepartment = (user) => ROLE_DEPARTMENT[user?.role] || null

// Regular users see their own tasks (owned or earmarked) and their
// department's tasks. Admin/management see everything.
export function canSeeTask(user, task) {
  if (!user || !task) return false
  if (isManager(user)) return true
  if (task.assignedUserId && task.assignedUserId === user.id) return true
  if (task.acceptedBy && task.acceptedBy === user.name) return true
  const dept = userDepartment(user)
  return !!dept && task.assignedDepartment === dept
}

export function canActOnTask(user, task, action) {
  if (!user || !task) return false
  const manager = isManager(user)
  const isOwner = !!task.acceptedBy && task.acceptedBy === user.name

  switch (action) {
    case 'accept': {
      if (task.acceptedBy) return false
      const dept = userDepartment(user)
      const deptMatch = !!dept && task.assignedDepartment === dept
      const roleMatch = task.assignedRole === user.role
      return (deptMatch || roleMatch || user.role === 'admin') && can(user, 'tasks.update')
    }
    case 'start':
    case 'complete':
    case 'block':
    case 'unblock':
      return isOwner
    case 'cancel':
      return manager || task.createdBy === user.name
    case 'release':
      return isOwner || manager
    case 'reassign':
      return manager
    default:
      return false
  }
}
