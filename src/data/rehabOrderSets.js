// ─────────────────────────────────────────────────────────────
// Physio rehab order sets (SA-P3, §10.11) — prefill a NEW treatment
// plan's top-level fields (diagnosis, goals, plannedSessions, frequency)
// for the physiotherapist to adjust and confirm before saving. Unlike
// dental's order sets (§9.12), which insert procedure-plan ITEMS into an
// already-existing plan, a treatment plan has no item list — the whole
// plan's fields are what gets prefilled here, so applying one is just a
// form-fill, not a repository write; nothing is created until the
// physiotherapist actually saves the plan.
// ─────────────────────────────────────────────────────────────

export const REHAB_ORDER_SETS = {
  kneeRehab: {
    label: 'Knee rehab plan',
    diagnosis: 'Knee pain / post-injury rehabilitation',
    goals: 'Restore pain-free knee flexion and extension; return to independent, unaided ambulation',
    plannedSessions: 12,
    frequency: '3x/week for 4 weeks',
  },
  lowBackProgram: {
    label: 'Low-back program',
    diagnosis: 'Mechanical low back pain',
    goals: 'Reduce pain to 2/10 or less; restore lumbar flexion; return to functional daily activity',
    plannedSessions: 10,
    frequency: '2–3x/week for 4–5 weeks',
  },
}
