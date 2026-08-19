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
