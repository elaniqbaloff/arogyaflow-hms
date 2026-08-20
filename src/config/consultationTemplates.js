// ─────────────────────────────────────────────────────────────
// Consultation field templates by department type.
//
// Ayurveda-first: Ayurveda departments get the full classical
// assessment block. MOU/allied departments (Allopathy, Dental,
// PMR, Diet, etc.) get the lighter common-field template only.
//
// `departments` (seed.js) already carries a `type` per department:
//   'ayurveda' | 'modern' | 'support' | 'wellness'
// We treat 'ayurveda' as the Ayurveda template; everything else
// uses the common/MOU template.
// ─────────────────────────────────────────────────────────────

// Fields shown for every department, regardless of type.
export const COMMON_FIELDS = [
  'chiefComplaint',
  'diagnosis',
  'notes',
  'treatment',
  'vitalsSnapshot',
  'allergyConfirmed',
  'followUpDate',
  'referral',
  'consentRequired',
]

// Additional fields shown only for Ayurveda-type departments.
export const AYURVEDA_FIELDS = [
  'nadi',
  'prakriti',
  'vikriti',
  'samprapti',
  'samprapliGhataka',
  'balaAssessment',
  'chikitsaSutra',
  'anupana',
  'therapyAdvice',
  'pathyaApathya',
]

// Fields that are mandatory for ALL departments.
export const MANDATORY_COMMON_FIELDS = [
  'chiefComplaint',
  'diagnosis',
  'treatment',
  'allergyConfirmed',
]

// Fields that are mandatory ONLY for Ayurveda-type departments.
export const MANDATORY_AYURVEDA_FIELDS = [
  'prakriti',
  'vikriti',
  'samprapti',
  'chikitsaSutra',
  // pathyaApathya is mandatory whenever `treatment` is filled —
  // enforced conditionally in the form, not listed as a hard
  // always-required field here.
]

// Additional fields shown only for the Dental department (§9.2).
export const DENTAL_FIELDS = [
  'dentalComplaintTooth',
  'oralExamFindings',
  'dentalDiagnosis',
  'procedurePerformed',
  'anesthesiaUsed',
  'postOpInstructions',
  'nextVisitPlan',
]

// Dental's mandatory set replaces the generic diagnosis/treatment
// requirement with the tooth-level dentalDiagnosis field — it is NOT
// MANDATORY_COMMON_FIELDS + extras.
export const MANDATORY_DENTAL_FIELDS = [
  'chiefComplaint',
  'dentalDiagnosis',
  'allergyConfirmed',
]

// Additional fields shown only for the Physiotherapy department (§10.2),
// SOAP-shaped. `chiefComplaint` (Subjective: complaint) and `treatment`
// (Plan) are reused from COMMON_FIELDS rather than duplicated — same
// reuse pattern DENTAL_FIELDS uses for chiefComplaint.
export const PHYSIO_FIELDS = [
  // Subjective
  'physioHistory',
  'painScore',
  'functionalLimitations',
  // Objective
  'romEntries',
  'strengthGrade',
  'gaitPostureNotes',
  'specialTests',
  // Assessment
  'clinicalImpression',
  'goalsShort',
  'goalsLong',
  // Plan
  'sessionsRecommended',
  'sessionFrequency',
  'precautions',
]

// Mirrors dental's pattern: bespoke mandatory set, not
// MANDATORY_COMMON_FIELDS + extras. Blueprint §10.2: "Mandatory:
// complaint, painScore, impression, plan" — complaint/plan map onto the
// reused chiefComplaint/treatment fields.
export const MANDATORY_PHYSIO_FIELDS = [
  'chiefComplaint',
  'painScore',
  'clinicalImpression',
  'treatment',
]

// Department types treated as "Ayurveda-first" for template purposes.
// (Legacy fallback — see templateKeyFor below.)
export const AYURVEDA_DEPARTMENT_TYPES = ['ayurveda']

// Keyed template registry. A department picks its template via
// `consultationTemplate` ('ayurveda' | 'dental' | 'physio-assessment' |
// 'common' for now); more keys can be added here as new department
// categories get their own field sets.
export const TEMPLATES = {
  ayurveda: {
    fields: [...COMMON_FIELDS, ...AYURVEDA_FIELDS],
    mandatory: [...MANDATORY_COMMON_FIELDS, ...MANDATORY_AYURVEDA_FIELDS],
  },
  dental: {
    fields: [...COMMON_FIELDS, ...DENTAL_FIELDS],
    mandatory: [...MANDATORY_DENTAL_FIELDS],
  },
  'physio-assessment': {
    fields: [...COMMON_FIELDS, ...PHYSIO_FIELDS],
    mandatory: [...MANDATORY_PHYSIO_FIELDS],
  },
  common: {
    fields: [...COMMON_FIELDS],
    mandatory: [...MANDATORY_COMMON_FIELDS],
  },
}

// Resolves a department to a TEMPLATES key: prefers the department's own
// `consultationTemplate`; falls back to the old type-based check for
// departments that predate that field (e.g. not-yet-migrated legacy state).
function templateKeyFor(department) {
  if (!department) return 'common'
  if (department.consultationTemplate && TEMPLATES[department.consultationTemplate]) {
    return department.consultationTemplate
  }
  return AYURVEDA_DEPARTMENT_TYPES.includes(department.type) ? 'ayurveda' : 'common'
}

/**
 * Returns true if the given department object should use the
 * Ayurveda consultation template.
 */
export function isAyurvedaDepartment(department) {
  return templateKeyFor(department) === 'ayurveda'
}

/**
 * Returns true if the given department object should use the
 * Dental consultation template.
 */
export function isDentalDepartment(department) {
  return templateKeyFor(department) === 'dental'
}

/**
 * Returns true if the given department object should use the
 * Physiotherapy (SOAP) consultation template.
 */
export function isPhysioDepartment(department) {
  return templateKeyFor(department) === 'physio-assessment'
}

/**
 * Returns the ordered list of field keys to render for a
 * consultation form, based on the department.
 */
export function getConsultationFields(department) {
  return [...TEMPLATES[templateKeyFor(department)].fields]
}

/**
 * Returns the set of mandatory field keys for a consultation form,
 * based on the department.
 */
export function getMandatoryFields(department) {
  return [...TEMPLATES[templateKeyFor(department)].mandatory]
}

// ── Vitals abnormal-range thresholds (used by flagAbnormalVitals) ──
// Conservative adult thresholds; intended as a non-blocking
// point-of-care indicator, not a diagnostic tool.
export const VITALS_THRESHOLDS = {
  bpSystolicHigh: 140,
  bpSystolicLow: 90,
  bpDiastolicHigh: 90,
  bpDiastolicLow: 60,
  pulseHigh: 100,
  pulseLow: 60,
  tempHighC: 37.5,
  spo2Low: 94,
}
