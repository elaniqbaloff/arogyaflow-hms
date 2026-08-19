// ─────────────────────────────────────────────────────────────
// Clinical Smart Assist — pure, local, offline suggestion engine over
// the curated clinicalDictionary plus live master data merged in at
// query time (medicines, lab tests, Panchakarma pricing rows — never
// duplicated into the static dictionary, always read fresh from state).
// ─────────────────────────────────────────────────────────────

import { clinicalTerms } from '../data/clinicalDictionary'

// fieldKey -> categories that field cares most about. suggest() boosts
// matches whose category is bound to the fieldKey the caller passes in.
export const FIELD_BINDINGS = {
  chiefComplaint: ['symptoms'],
  diagnosis: ['diagnosis-allopathy', 'diagnosis-ayurveda'],
  notes: ['symptoms', 'procedure'],
  treatment: ['procedure', 'panchakarma-therapy', 'allopathy-term', 'dental-procedure', 'physio-term'],
  therapyAdvice: ['panchakarma-therapy', 'advice-template'],
  chikitsaSutra: ['ayurveda-concept', 'panchakarma-therapy'],
  followUp: ['advice-template'],
  medicineName: ['medicine'],
  labTestName: ['lab-test'],
  nursingNote: ['vital', 'procedure'],
  dischargeAdvice: ['discharge-template', 'advice-template'],
  oralExamFindings: ['dental-term'],
  dentalDiagnosis: ['dental-term'],
  procedurePerformed: ['dental-procedure'],
  postOpInstructions: ['advice-template'],
  nextVisitPlan: ['advice-template'],
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── Per-user "recently inserted" term history ──
// Same defensive try/catch localStorage pattern as storageAdapter.js, kept
// separate from the main app state (this is UI-personalization data, not
// something that needs to round-trip through the state/audit model).
const RECENT_KEY_PREFIX = 'arogyaflow-smartassist-recent-'
const MAX_RECENT_TERMS = 20

export function getRecentTermIds(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(RECENT_KEY_PREFIX + userId)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Call when a suggestion is actually inserted (not on every keystroke) so
// the user's next few queries rank their own recent picks higher.
export function recordRecentTerm(userId, termId) {
  if (!userId || !termId) return
  try {
    const next = [termId, ...getRecentTermIds(userId).filter((id) => id !== termId)].slice(0, MAX_RECENT_TERMS)
    localStorage.setItem(RECENT_KEY_PREFIX + userId, JSON.stringify(next))
  } catch {
    /* ignore — ranking boost just won't apply this session */
  }
}

// Merges live master collections into the searchable pool, tagged with
// the categories the dictionary already uses so they rank alongside
// curated terms. Never mutates or persists — computed fresh per call.
function buildPool(state) {
  const dictionary = clinicalTerms.filter((t) => t.active !== false)

  const medicines = (state?.medicines || []).map((m) => ({
    id: `live_med_${m.id}`, term: m.name, category: 'medicine',
    departments: [], aliases: [], abbreviations: [], templateText: null,
  }))

  const seenTests = new Set()
  const labTests = (state?.labTests || [])
    .filter((t) => t.testName && !seenTests.has(t.testName) && seenTests.add(t.testName))
    .map((t) => ({
      id: `live_lab_${t.id}`, term: t.testName, category: 'lab-test',
      departments: ['DIAG'], aliases: [], abbreviations: [], templateText: null,
    }))

  const panchakarmaPricing = (state?.pricing || [])
    .filter((p) => p.department === 'Panchakarma')
    .map((p) => ({
      id: `live_pk_${p.id}`, term: p.name, category: 'panchakarma-therapy',
      departments: ['AYUR', 'PANCH'], aliases: [], abbreviations: [], templateText: null,
    }))

  return [...dictionary, ...medicines, ...labTests, ...panchakarmaPricing]
}

/**
 * suggest(query, { state, user, departmentCode, fieldKey, limit })
 *
 * Triggers at 2+ characters, case-insensitive. Match priority (highest
 * first): exact abbreviation > term prefix > alias prefix > word-boundary
 * contains. Within a tier, matches rank by an additive boost score, then
 * alphabetically:
 *  - +1 category is bound to the given `fieldKey` (FIELD_BINDINGS)
 *  - +2 `departmentCode` appears in the term's `departments`
 *  - +1 the term's category is in the department's `dictionaryScopes`
 *  - +1 the term is among the user's ~20 most recently inserted terms
 */
export function suggest(query, { state, user, departmentCode, fieldKey, limit = 8 } = {}) {
  const q = (query || '').trim().toLowerCase()
  if (q.length < 2) return []

  const boundedCategories = FIELD_BINDINGS[fieldKey] || []
  const wordBoundary = new RegExp(`\\b${escapeRegExp(q)}`, 'i')

  const dept = departmentCode ? (state?.departments || []).find((d) => d.code === departmentCode) : null
  const dictionaryScopes = dept?.dictionaryScopes || []
  const recentTermIds = getRecentTermIds(user?.id)

  const pool = buildPool(state || {})
  const matches = []

  for (const entry of pool) {
    const termLower = entry.term.toLowerCase()
    const aliases = entry.aliases || []
    const abbreviations = entry.abbreviations || []

    let tier
    if (abbreviations.some((a) => a.toLowerCase() === q)) tier = 0
    else if (termLower.startsWith(q)) tier = 1
    else if (aliases.some((a) => a.toLowerCase().startsWith(q))) tier = 2
    else if (wordBoundary.test(entry.term) || aliases.some((a) => wordBoundary.test(a))) tier = 3
    else continue

    let boost = 0
    if (boundedCategories.includes(entry.category)) boost += 1
    if (departmentCode && (entry.departments || []).includes(departmentCode)) boost += 2
    if (dictionaryScopes.includes(entry.category)) boost += 1
    if (recentTermIds.includes(entry.id)) boost += 1

    matches.push({ entry, tier, boost })
  }

  matches.sort((a, b) =>
    a.tier - b.tier ||
    b.boost - a.boost ||
    a.entry.term.localeCompare(b.entry.term)
  )

  return matches.slice(0, limit).map(({ entry }) => ({
    id: entry.id, term: entry.term, category: entry.category, templateText: entry.templateText || undefined,
  }))
}
