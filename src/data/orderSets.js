// ─────────────────────────────────────────────────────────────
// Smart Assist order sets (SA-P3, §9.12) — a named set of procedure-plan
// items that prefill in one action instead of several manual "Add item"
// round-trips. The dentist still reviews, edits, and confirms each item
// through the normal proposed→accepted→... lifecycle; nothing here
// auto-accepts or auto-bills anything.
//
// `priceCode` resolves against pricing.code at apply time (repositories.js
// applyOrderSet) — never hardcode an amount here, so a pricing change is
// picked up automatically.
// ─────────────────────────────────────────────────────────────

export const ORDER_SETS = {
  rctToCrown: {
    label: 'RCT → Crown plan',
    description: 'Root canal treatment through to the final crown restoration.',
    // The classical 4-stage RCT-to-crown pathway (consult → access/
    // instrumentation → obturation → crown) collapses to two BILLED items,
    // matching the pricing catalog's actual granularity (one consolidated
    // RCT fee, one separate crown fee) — the phase text keeps the
    // intermediate clinical stages visible without inventing line items
    // nothing in the pricing master actually charges for separately.
    items: [
      { priceCode: 'DENT-RCT', phase: 'Access & Instrumentation → Obturation' },
      { priceCode: 'DENT-CROWN', phase: 'Post-Endodontic Restoration' },
    ],
  },
}
