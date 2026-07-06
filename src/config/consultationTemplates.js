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

// Department types treated as "Ayurveda-first" for template purposes.
export const AYURVEDA_DEPARTMENT_TYPES = ['ayurveda']

/**
 * Returns true if the given department object should use the
 * Ayurveda consultation template.
 */
export function isAyurvedaDepartment(department) {
  if (!department) return false
  return AYURVEDA_DEPARTMENT_TYPES.includes(department.type)
}

/**
 * Returns the ordered list of field keys to render for a
 * consultation form, based on the department.
 */
export function getConsultationFields(department) {
  return isAyurvedaDepartment(department)
    ? [...COMMON_FIELDS, ...AYURVEDA_FIELDS]
    : [...COMMON_FIELDS]
}

/**
 * Returns the set of mandatory field keys for a consultation form,
 * based on the department.
 */
export function getMandatoryFields(department) {
  return isAyurvedaDepartment(department)
    ? [...MANDATORY_COMMON_FIELDS, ...MANDATORY_AYURVEDA_FIELDS]
    : [...MANDATORY_COMMON_FIELDS]
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
