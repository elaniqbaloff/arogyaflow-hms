// ─────────────────────────────────────────────────────────────
// Central status -> Badge tone maps. Pages import from here instead of
// keeping their own parallel *_TONE consts, so a status renders the same
// color everywhere it appears.
// ─────────────────────────────────────────────────────────────

export const TASK_STATUS_TONES = {
  Pending: 'gold', Accepted: 'sky', 'In Progress': 'sky', Blocked: 'rose', Completed: 'green', Cancelled: 'slate',
}

export const TASK_PRIORITY_TONES = { Low: 'slate', Normal: 'sky', High: 'gold', Critical: 'rose' }

export const APPROVAL_STATUS_TONES = { Pending: 'gold', Approved: 'green', Rejected: 'rose' }

// Generic lowercase status -> tone, shared by <Badge status="…" /> across
// bills, episodes, lab tests, prescriptions and anything else that renders
// its own status string as-is.
export const STATUS_TONES = {
  scheduled: 'sky', completed: 'green', cancelled: 'rose', pending: 'gold',
  paid: 'green', partial: 'gold', dispensed: 'green', active: 'green',
  disabled: 'slate', requested: 'gold', 'in-progress': 'sky',
  proposed: 'gold', accepted: 'sky',
  // Lab sample-state pipeline (§11 Phase 7a): ordered/resulted still need
  // action (gold), collected is in-flight (sky), acknowledged is closed out (green).
  ordered: 'gold', collected: 'sky', resulted: 'gold', acknowledged: 'green',
}
