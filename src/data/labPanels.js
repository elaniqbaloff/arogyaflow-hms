// ─────────────────────────────────────────────────────────────
// Grouped lab test orders (§11 Phase 7b) — picking a panel creates several
// individual labTests records in one atomic batch (all starting 'ordered'),
// tagged with a shared panelId/panelLabel so the worklist can show which
// rows belong together. Resolved by literal test name, not a priced catalog
// row — unlike dental/physio's order sets, Diagnostics has no per-test
// pricing master to key off of yet, so a name change here doesn't
// auto-propagate anywhere. Revisit if a lab pricing catalog is added later.
// ─────────────────────────────────────────────────────────────

export const LAB_PANELS = {
  lipidPanel: {
    label: 'Lipid Panel',
    tests: ['Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides'],
  },
  liverPanel: {
    label: 'Liver Function Panel',
    tests: ['SGPT (ALT)', 'SGOT (AST)', 'Bilirubin (Total)', 'Alkaline Phosphatase'],
  },
  thyroidPanel: {
    label: 'Thyroid Panel',
    tests: ['TSH', 'T3', 'T4'],
  },
  renalPanel: {
    label: 'Renal Function Panel',
    tests: ['Blood Urea', 'Serum Creatinine', 'Serum Electrolytes'],
  },
}
