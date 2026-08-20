// ─────────────────────────────────────────────────────────────
// Department config helpers — read-only lookups over state.departments.
// Pure functions; no state, no dispatch.
// ─────────────────────────────────────────────────────────────

export function getDepartment(state, code) {
  return (state.departments || []).find((d) => d.code === code) || null
}

// Active departments — the list any department <Select> in the app should
// build its <option>s from instead of reading state.departments directly.
export function departmentOptions(state) {
  return (state.departments || []).filter((d) => d.active !== false)
}

// A department's `head` may be a user/doctor id (where a matching record
// exists) or a plain name string (where it doesn't) — resolves either to a
// display name.
export function departmentHeadName(state, dept) {
  if (!dept?.head) return '—'
  const match =
    (state.users || []).find((u) => u.id === dept.head) ||
    (state.doctors || []).find((d) => d.id === dept.head)
  return match?.name || dept.head
}

// department.color (seeded since Phase 3a: green/sky/gold/rose/slate) has
// had no consumer anywhere in the UI until §11 Phase 8b's journey-tab
// department dots — reuses the exact tone vocabulary primitives.jsx's
// BADGE_TONES already uses for status badges, so the two stay visually
// consistent instead of introducing a second, parallel color system.
export const DEPARTMENT_DOT_CLASSES = {
  green: 'bg-brand-600', gold: 'bg-gold-500', rose: 'bg-rose-500', sky: 'bg-sky-500', slate: 'bg-slate-400',
}
export function departmentDotClass(state, code) {
  const dept = getDepartment(state, code)
  return DEPARTMENT_DOT_CLASSES[dept?.color] || DEPARTMENT_DOT_CLASSES.slate
}
