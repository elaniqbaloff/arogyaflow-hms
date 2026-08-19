// ─────────────────────────────────────────────────────────────
// Clinical Smart Assist dictionary — curated seed terms for the
// autocomplete/suggestion engine (services/smartAssist.js).
//
// Shape: { id, term, category, departments, aliases, abbreviations,
//          relatedPhrases, templateText, language, active, source }
//
// `departments` holds department CODEs (see src/data/seed.js) the term
// is most relevant to — used for department-aware ranking in a later
// phase, not consumed yet.
//
// Live master data (medicines, lab tests, Panchakarma pricing rows) is
// deliberately NOT duplicated here — smartAssist.js merges those in at
// query time so this file never drifts from the real inventory.
//
// Categories (exactly these): symptoms, diagnosis-allopathy,
// diagnosis-ayurveda, ayurveda-concept, panchakarma-therapy,
// allopathy-term, dental-term, dental-procedure, physio-term,
// physio-assessment-phrase, vital, procedure, advice-template,
// discharge-template.
// ─────────────────────────────────────────────────────────────

const term = (id, term, category, departments, extra = {}) => ({
  id,
  term,
  category,
  departments,
  aliases: extra.aliases || [],
  abbreviations: extra.abbreviations || [],
  relatedPhrases: extra.relatedPhrases || [],
  templateText: extra.templateText || null,
  language: 'en',
  active: true,
  source: 'seed',
})

// ── Panchakarma therapies (17 — the classical protocols already named
//    across pricing/seed/therapies) ──
const PANCHAKARMA_THERAPIES = [
  term('ct_abhyanga', 'Abhyanga', 'panchakarma-therapy', ['AYUR', 'PANCH'], { aliases: ['Abhyangam'], relatedPhrases: ['full body warm oil massage'] }),
  term('ct_shirodhara', 'Shirodhara', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['continuous oil stream on forehead'] }),
  term('ct_shirovasti', 'Shirovasti', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['medicated oil retained on scalp'] }),
  term('ct_kizhi', 'Kizhi', 'panchakarma-therapy', ['AYUR', 'PANCH'], { aliases: ['Podikizhi'], relatedPhrases: ['herbal bolus massage'] }),
  term('ct_dhanyamla_kizhi', 'Dhanyamla Kizhi', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['fermented liquid bolus massage'] }),
  term('ct_pizhichil', 'Pizhichil', 'panchakarma-therapy', ['AYUR', 'PANCH'], { aliases: ['Sarvanga Dhara'], relatedPhrases: ['warm oil bath massage'] }),
  term('ct_kati_basti', 'Kati Basti', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['medicated oil pool over lower back'] }),
  term('ct_janu_basti', 'Janu Basti', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['medicated oil pool over the knee'] }),
  term('ct_greeva_basti', 'Greeva Basti', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['medicated oil pool over the neck'] }),
  term('ct_udwarthana', 'Udwarthana', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['herbal powder massage'] }),
  term('ct_swedana', 'Swedana', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['herbal steam therapy'] }),
  term('ct_avagaha_sweda', 'Avagaha Sweda', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['medicated oil immersion bath'] }),
  term('ct_tharpana', 'Tharpana', 'panchakarma-therapy', ['AYUR', 'PANCH'], { aliases: ['Netra Tharpana'], relatedPhrases: ['medicated ghee eye treatment'] }),
  term('ct_marma_chikitsa', 'Marma Chikitsa', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['vital point therapy'] }),
  term('ct_rasa_chikitsa', 'Rasa Chikitsa', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['mineral-based treatment'] }),
  term('ct_rasayana_chikitsa', 'Rasayana Chikitsa', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['rejuvenation therapy'] }),
  term('ct_vajeekarana_chikitsa', 'Vajeekarana Chikitsa', 'panchakarma-therapy', ['AYUR', 'PANCH'], { relatedPhrases: ['reproductive/vitality therapy'] }),
]

// ── Common symptoms (~30) ──
const SYMPTOMS = [
  ['ct_sym_fever', 'Fever'],
  ['ct_sym_cough', 'Cough'],
  ['ct_sym_headache', 'Headache'],
  ['ct_sym_nausea', 'Nausea'],
  ['ct_sym_vomiting', 'Vomiting'],
  ['ct_sym_fatigue', 'Fatigue'],
  ['ct_sym_dizziness', 'Dizziness'],
  ['ct_sym_joint_pain', 'Joint pain'],
  ['ct_sym_back_pain', 'Back pain'],
  ['ct_sym_abdominal_pain', 'Abdominal pain'],
  ['ct_sym_chest_pain', 'Chest pain'],
  ['ct_sym_breathlessness', 'Shortness of breath'],
  ['ct_sym_constipation', 'Constipation'],
  ['ct_sym_diarrhea', 'Diarrhea'],
  ['ct_sym_loss_of_appetite', 'Loss of appetite'],
  ['ct_sym_weight_loss', 'Unintentional weight loss'],
  ['ct_sym_weight_gain', 'Unintentional weight gain'],
  ['ct_sym_insomnia', 'Insomnia'],
  ['ct_sym_swelling', 'Swelling'],
  ['ct_sym_numbness', 'Numbness'],
  ['ct_sym_tingling', 'Tingling sensation'],
  ['ct_sym_muscle_weakness', 'Muscle weakness'],
  ['ct_sym_stiffness', 'Stiffness'],
  ['ct_sym_burning_sensation', 'Burning sensation'],
  ['ct_sym_itching', 'Itching'],
  ['ct_sym_rash', 'Skin rash'],
  ['ct_sym_sore_throat', 'Sore throat'],
  ['ct_sym_nasal_congestion', 'Nasal congestion'],
  ['ct_sym_palpitations', 'Palpitations'],
  ['ct_sym_excessive_thirst', 'Excessive thirst'],
].map(([id, t]) => term(id, t, 'symptoms', ['AYUR', 'ALLO', 'DENT', 'PHYS']))

// ── Allopathy diagnoses, with abbreviations (~20) ──
const DIAGNOSES_ALLOPATHY = [
  ['ct_dx_hypertension', 'Hypertension', ['HT', 'HTN']],
  ['ct_dx_diabetes', 'Diabetes Mellitus', ['DM']],
  ['ct_dx_t2dm', 'Type 2 Diabetes Mellitus', ['T2DM']],
  ['ct_dx_hypothyroidism', 'Hypothyroidism', []],
  ['ct_dx_hyperthyroidism', 'Hyperthyroidism', []],
  ['ct_dx_cad', 'Coronary Artery Disease', ['CAD']],
  ['ct_dx_ckd', 'Chronic Kidney Disease', ['CKD']],
  ['ct_dx_uti', 'Urinary Tract Infection', ['UTI']],
  ['ct_dx_urti', 'Upper Respiratory Tract Infection', ['URTI']],
  ['ct_dx_gerd', 'Gastroesophageal Reflux Disease', ['GERD']],
  ['ct_dx_oa', 'Osteoarthritis', ['OA']],
  ['ct_dx_ra', 'Rheumatoid Arthritis', ['RA']],
  ['ct_dx_copd', 'Chronic Obstructive Pulmonary Disease', ['COPD']],
  ['ct_dx_anemia', 'Anemia', []],
  ['ct_dx_asthma', 'Bronchial Asthma', []],
  ['ct_dx_migraine', 'Migraine', []],
  ['ct_dx_pud', 'Peptic Ulcer Disease', ['PUD']],
  ['ct_dx_ibs', 'Irritable Bowel Syndrome', ['IBS']],
  ['ct_dx_dvt', 'Deep Vein Thrombosis', ['DVT']],
  ['ct_dx_cva', 'Cerebrovascular Accident', ['CVA']],
].map(([id, t, abbreviations]) => term(id, t, 'diagnosis-allopathy', ['ALLO'], { abbreviations }))

// ── Ayurveda diagnoses (~10) ──
const DIAGNOSES_AYURVEDA = [
  ['ct_dx_amavata', 'Amavata', 'Rheumatoid-type joint disease'],
  ['ct_dx_sandhivata', 'Sandhivata', 'Osteoarthritis-type joint disease'],
  ['ct_dx_kati_shoola', 'Kati Shoola', 'Lower back pain'],
  ['ct_dx_gridhrasi', 'Gridhrasi', 'Sciatica'],
  ['ct_dx_prameha', 'Prameha', 'Diabetes-spectrum disorder'],
  ['ct_dx_jeerna_jwara', 'Jeerna Jwara', 'Chronic fever'],
  ['ct_dx_agnimandya', 'Agnimandya', 'Weak digestive fire'],
  ['ct_dx_grahani', 'Grahani', 'IBS-type digestive disorder'],
  ['ct_dx_vata_vyadhi', 'Vata Vyadhi', 'Vata-predominant disorder'],
  ['ct_dx_shirahshoola', 'Shirahshoola', 'Headache disorder'],
].map(([id, t, phrase]) => term(id, t, 'diagnosis-ayurveda', ['AYUR', 'PANCH'], { relatedPhrases: [phrase] }))

// ── Vitals ──
const VITALS = [
  ['ct_vit_bp', 'Blood Pressure', ['BP']],
  ['ct_vit_pulse', 'Pulse Rate', []],
  ['ct_vit_rr', 'Respiratory Rate', ['RR']],
  ['ct_vit_temp', 'Body Temperature', []],
  ['ct_vit_spo2', 'Oxygen Saturation', ['SpO2']],
  ['ct_vit_sugar', 'Blood Sugar', []],
  ['ct_vit_bmi', 'Body Mass Index', ['BMI']],
  ['ct_vit_weight', 'Weight', []],
  ['ct_vit_height', 'Height', []],
].map(([id, t, abbreviations]) => term(id, t, 'vital', ['AYUR', 'ALLO', 'PHYS', 'DIAG'], { abbreviations }))

// ── Ayurveda-concept starter pack ──
const AYURVEDA_CONCEPTS = [
  ['ct_con_ama', 'Ama', 'accumulated metabolic toxins'],
  ['ct_con_agni', 'Agni', 'digestive fire'],
  ['ct_con_vata', 'Vata Dosha', 'movement/air-space principle'],
  ['ct_con_pitta', 'Pitta Dosha', 'metabolism/fire-water principle'],
  ['ct_con_kapha', 'Kapha Dosha', 'structure/earth-water principle'],
  ['ct_con_prakriti', 'Prakriti', 'inborn constitution'],
  ['ct_con_vikriti', 'Vikriti', 'current dosha imbalance'],
  ['ct_con_dhatu', 'Dhatu', 'body tissue'],
  ['ct_con_srotas', 'Srotas', 'bodily channel/pathway'],
  ['ct_con_ojas', 'Ojas', 'vital essence/immunity'],
].map(([id, t, phrase]) => term(id, t, 'ayurveda-concept', ['AYUR', 'PANCH'], { relatedPhrases: [phrase] }))

// ── Dental — general vocabulary (~11) — surface/notation terms (§9.12
//    "tooth-notation snippets") pair with the tooth already picked via
//    ToothPicker elsewhere in the form, so they stay tooth-number-free here.
const DENTAL_TERMS = [
  'Cavity', 'Plaque', 'Gingivitis', 'Periodontitis', 'Dental Abscess', 'Malocclusion', 'Dentin Hypersensitivity',
  'Mesial Caries', 'Distal Caries', 'Occlusal Caries', 'Recurrent Caries',
].map((t, i) => term(`ct_dent_term_${i}`, t, 'dental-term', ['DENT']))

// ── Dental procedures (~17) — includes the three named RCT phases
//    (access/instrumentation, obturation, restoration) the RCT order set
//    (SA-P3, ProcedurePlanPanel) prefills, and crown/implant sub-types.
const DENTAL_PROCEDURES = [
  ['ct_dent_rct', 'Root Canal Treatment', ['RCT']],
  ['ct_dent_extraction', 'Tooth Extraction', [], ['Extraction under LA']],
  ['ct_dent_scaling', 'Scaling and Polishing', []],
  ['ct_dent_filling', 'Composite Filling', []],
  ['ct_dent_gic_filling', 'GIC Filling', ['GIC'], ['Glass Ionomer Filling']],
  ['ct_dent_crown', 'Dental Crown', []],
  ['ct_dent_crown_pfm', 'PFM Crown', ['PFM']],
  ['ct_dent_crown_zirconia', 'Zirconia Crown', []],
  ['ct_dent_crown_ceramic', 'Ceramic Crown', []],
  ['ct_dent_implant', 'Dental Implant', []],
  ['ct_dent_implant_stage1', 'Implant Placement (Stage 1)', []],
  ['ct_dent_implant_stage2', 'Implant Restoration (Stage 2)', []],
  ['ct_dent_whitening', 'Teeth Whitening', []],
  ['ct_dent_denture', 'Denture Fitting', []],
  ['ct_dent_rct_access', 'Access & Instrumentation', []],
  ['ct_dent_rct_obturation', 'Obturation', []],
  ['ct_dent_rct_restoration', 'Post-Endodontic Restoration', []],
].map(([id, t, abbreviations, aliases]) => term(id, t, 'dental-procedure', ['DENT'], { abbreviations, aliases }))

// ── Physio terms (~7) ──
const PHYSIO_TERMS = [
  ['ct_phys_rom', 'Range of Motion', ['ROM']],
  ['ct_phys_nprs', 'Numeric Pain Rating Scale', ['NPRS']],
  ['ct_phys_mmt', 'Manual Muscle Testing', ['MMT']],
  ['ct_phys_spasticity', 'Spasticity', []],
  ['ct_phys_contracture', 'Contracture', []],
  ['ct_phys_hemiparesis', 'Hemiparesis', []],
  ['ct_phys_strengthening', 'Muscle Strengthening', []],
].map(([id, t, abbreviations]) => term(id, t, 'physio-term', ['PHYS', 'OT'], { abbreviations }))

// ── Physio assessment phrases (~8) ──
const PHYSIO_PHRASES = [
  'Gait training', 'Unable to bear weight', 'Improved balance since last session',
  'Requires assistance for transfers', 'Independent with mobility aid', 'Weakness on affected side',
  'Tolerating exercises well', 'Reduced pain on movement',
].map((t, i) => term(`ct_phys_phrase_${i}`, t, 'physio-assessment-phrase', ['PHYS', 'OT']))

// ── General procedures (~9) ──
const PROCEDURES = [
  'Suturing', 'Wound Dressing', 'Intravenous Injection', 'Intramuscular Injection', 'Nebulization',
  'Catheterization', 'Biopsy', 'X-ray Imaging', 'ECG Recording',
].map((t, i) => term(`ct_proc_${i}`, t, 'procedure', ['ALLO', 'AYUR']))

// ── Allopathy shorthand terms (~9) ──
const ALLOPATHY_TERMS = [
  ['ct_allo_npo', 'Nil by Mouth', ['NPO']],
  ['ct_allo_bid', 'Twice Daily', ['BID']],
  ['ct_allo_tid', 'Thrice Daily', ['TID']],
  ['ct_allo_od', 'Once Daily', ['OD']],
  ['ct_allo_prn', 'As Needed', ['PRN']],
  ['ct_allo_iv', 'Intravenous', ['IV']],
  ['ct_allo_im', 'Intramuscular', ['IM']],
  ['ct_allo_sc', 'Subcutaneous', ['SC']],
  ['ct_allo_before_food', 'Before Food', []],
].map(([id, t, abbreviations]) => term(id, t, 'allopathy-term', ['ALLO'], { abbreviations }))

// ── Advice templates (5) ──
const ADVICE_TEMPLATES = [
  term('ct_advice_general', 'General post-consultation advice', 'advice-template', ['AYUR', 'ALLO'], {
    templateText: 'Continue prescribed medication as directed. Maintain adequate hydration and rest. Return for follow-up if symptoms persist or worsen.',
  }),
  term('ct_advice_diabetes', 'Diabetes lifestyle advice', 'advice-template', ['ALLO', 'AYUR'], {
    templateText: 'Follow a low-glycemic diet, monitor blood sugar regularly, engage in daily light exercise, and avoid missing medication doses.',
  }),
  term('ct_advice_post_panchakarma', 'Post-Panchakarma care advice', 'advice-template', ['AYUR', 'PANCH'], {
    templateText: 'Avoid cold food and beverages, prolonged travel, and heavy exertion for 3 days after therapy. Rest adequately and follow the prescribed Pathya-Apathya.',
  }),
  term('ct_advice_hypertension', 'Hypertension lifestyle advice', 'advice-template', ['ALLO'], {
    templateText: 'Reduce salt intake, monitor blood pressure regularly, avoid strenuous exertion, and continue prescribed antihypertensive medication.',
  }),
  term('ct_advice_wound_care', 'Post-procedure wound care advice', 'advice-template', ['ALLO', 'DENT'], {
    templateText: 'Keep the area clean and dry, avoid strenuous activity for 48 hours, watch for signs of infection, and return if pain or swelling increases.',
  }),
]

// ── Discharge templates (3) ──
const DISCHARGE_TEMPLATES = [
  term('ct_discharge_standard', 'Standard IPD discharge summary closing', 'discharge-template', ['AYUR', 'ALLO'], {
    templateText: 'Patient discharged in stable condition with advice for regular follow-up. Discharge medications explained to patient and attendant.',
  }),
  term('ct_discharge_panchakarma', 'Panchakarma programme completion note', 'discharge-template', ['AYUR', 'PANCH'], {
    templateText: 'Patient completed the residential Panchakarma protocol without complications. Home-care regimen and Pathya-Apathya explained to patient.',
  }),
  term('ct_discharge_post_surgical', 'Post-surgical discharge note', 'discharge-template', ['ALLO'], {
    templateText: 'Surgical site healing satisfactorily. Suture removal and follow-up review advised as scheduled. Wound care instructions given.',
  }),
]

export const clinicalTerms = [
  ...PANCHAKARMA_THERAPIES,
  ...SYMPTOMS,
  ...DIAGNOSES_ALLOPATHY,
  ...DIAGNOSES_AYURVEDA,
  ...VITALS,
  ...AYURVEDA_CONCEPTS,
  ...DENTAL_TERMS,
  ...DENTAL_PROCEDURES,
  ...PHYSIO_TERMS,
  ...PHYSIO_PHRASES,
  ...PROCEDURES,
  ...ALLOPATHY_TERMS,
  ...ADVICE_TEMPLATES,
  ...DISCHARGE_TEMPLATES,
]
