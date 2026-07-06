// ─────────────────────────────────────────────────────────────
// Product brand — single source of truth.
//
// Product:  ArogyaFlow  (by Elan Iqbal)
// Client:   Dr. P. Alikutty's Ayurveda & Modern Hospital
//
// Change branding here and it flows through the whole app + documents.
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  product: 'ArogyaFlow',
  productSuffix: 'Flow', // for two-tone wordmark: Arogya + Flow
  productRoot: 'Arogya',
  creator: 'Elan Iqbal',
  byline: 'by Elan Iqbal',
  tagline: 'Rooted in healing. Built for connected care.',
  platformType: 'Connected Hospital Operations Platform',
  description:
    'ArogyaFlow is a connected hospital operations platform inspired by “Arogya,” the timeless idea of complete health and well-being. It brings together modern hospital workflows, Ayurveda/Panchakarma care, billing, lab, pharmacy, IPD, OPD, patient journeys, approvals, reports, and multilingual patient-facing documents into one smooth workflow.',

  // Currently configured hospital / client
  client: {
    name: "Dr. P. Alikutty's Ayurveda & Modern Hospital",
    nameAr: 'مستشفى الدكتور ب. آليكوتي للأيورفيدا والطب الحديث',
    shortName: "Dr. P. Alikutty's",
    address: 'NH-66, Changuvetty, Kottakkal, Malappuram — 676 501, Kerala, India',
    addressAr: 'الطريق الوطني 66، تشانغوفيتي، كوتاكال، مالابورام — 676501، كيرالا، الهند',
    phone: '+91 483 280 8000',
  },

  // Stacked identity block used on docs / about
  identityLines: [
    'ArogyaFlow',
    'Connected Hospital Operations Platform',
    "Configured for Dr. P. Alikutty's Ayurveda & Modern Hospital",
    'by Elan Iqbal',
  ],

  // Future product tiers (roadmap)
  tiers: [
    { name: 'ArogyaFlow Core', desc: 'Basic clinic and OPD workflows' },
    { name: 'ArogyaFlow Plus', desc: 'OPD, IPD, billing, lab, pharmacy' },
    { name: 'ArogyaFlow Ayurveda', desc: 'Panchakarma and integrative care workflows' },
    { name: 'ArogyaFlow Gulf', desc: 'Arabic/bilingual GCC-ready edition' },
    { name: 'ArogyaFlow Enterprise', desc: 'Full hospital operations suite — approvals, audit logs, reports, multilingual documents, analytics, and advanced workflows' },
  ],
}

export const docFooter = `${BRAND.product} · ${BRAND.platformType} — ${BRAND.byline}`
