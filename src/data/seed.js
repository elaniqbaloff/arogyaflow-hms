import { daysFromNow, today } from '../lib/utils'

// ─────────────────────────────────────────────────────────────
// Seed data for Dr. P. Alikutty's Ayurveda & Modern Hospital.
//
// Model:
//  • patients   — ONE master record per person, ONE unique MRN.
//  • episodes    — OPD visits and IPD admissions, both linked to the
//                  master patient by patientId/mrn. OPD→IPD conversion
//                  adds an IPD episode WITHOUT duplicating the patient.
//  • beds        — ward/room/bed inventory with live status.
//  • vitals / nursingNotes / therapies — clinical activity.
//  • bills       — now carry discount + GST breakdown + OPD/IPD ref.
// Records are cross-linked by id so the demo feels connected.
// ─────────────────────────────────────────────────────────────

// `type` is the original, still-used ayurveda/modern/support/wellness split
// consultationTemplates.js falls back to. `category` is the newer, slightly
// different grouping used for department-engine/visual purposes (Physio/OT/
// Audiology moved from 'support' to 'allied' there). `head` references a
// user/doctor id where a matching record exists in doctors/users, otherwise
// it stays the plain name string — no user was invented for the rest.
// `dictionaryScopes` lists the Smart Assist clinicalDictionary categories
// (see clinicalDictionary.js) most relevant to this department — used to
// give matching suggestions a small ranking boost for that department's
// users (smartAssist.js).
export const departments = [
  { id: 'dep_ayur', name: 'Ayurveda', type: 'ayurveda', head: 'usr_doc', code: 'AYUR', category: 'ayurveda', color: 'green', icon: 'Leaf', appointmentTypes: ['Consultation', 'Follow-up', 'Panchakarma Review'], consultationTemplate: 'ayurveda', active: true, dictionaryScopes: ['diagnosis-ayurveda', 'ayurveda-concept', 'panchakarma-therapy', 'symptoms', 'vital', 'advice-template', 'discharge-template'] },
  { id: 'dep_allo', name: 'Allopathy', type: 'modern', head: 'usr_doc2', code: 'ALLO', category: 'modern', color: 'sky', icon: 'Stethoscope', appointmentTypes: ['Consultation', 'Follow-up'], consultationTemplate: 'common', active: true, dictionaryScopes: ['diagnosis-allopathy', 'allopathy-term', 'symptoms', 'vital', 'procedure', 'advice-template', 'discharge-template'] },
  { id: 'dep_dental', name: 'Dental', type: 'modern', head: 'doc_dental', code: 'DENT', category: 'modern', color: 'sky', icon: 'Smile', appointmentTypes: ['Consultation', 'Follow-up', 'Procedure'], consultationTemplate: 'common', active: true, dictionaryScopes: ['dental-term', 'dental-procedure', 'symptoms'] },
  { id: 'dep_physio', name: 'Physiotherapy', type: 'support', head: 'doc_physio', code: 'PHYS', category: 'allied', color: 'gold', icon: 'Activity', appointmentTypes: ['Assessment', 'Session', 'Follow-up'], consultationTemplate: 'common', active: true, dictionaryScopes: ['physio-term', 'physio-assessment-phrase', 'symptoms'] },
  { id: 'dep_ot', name: 'Occupational Therapy', type: 'support', head: 'Dr. Suresh Menon', code: 'OT', category: 'allied', color: 'gold', icon: 'HandHeart', appointmentTypes: ['Assessment', 'Session', 'Follow-up'], consultationTemplate: 'common', active: true, dictionaryScopes: ['physio-term', 'physio-assessment-phrase', 'symptoms'] },
  { id: 'dep_audio', name: 'Audiology & Speech', type: 'support', head: 'Dr. Leena Thomas', code: 'AUDIO', category: 'allied', color: 'gold', icon: 'Ear', appointmentTypes: ['Assessment', 'Session', 'Follow-up'], consultationTemplate: 'common', active: true, dictionaryScopes: ['symptoms'] },
  { id: 'dep_yoga', name: 'Yoga & Fitness', type: 'wellness', head: 'Mr. Gopan Das', code: 'YOGA', category: 'wellness', color: 'rose', icon: 'PersonStanding', appointmentTypes: ['Session', 'Assessment'], consultationTemplate: 'common', active: true, dictionaryScopes: ['symptoms', 'vital'] },
  { id: 'dep_beauty', name: 'Ayur Beauty Clinic', type: 'wellness', head: 'doc_beauty', code: 'BEAUTY', category: 'wellness', color: 'rose', icon: 'Sparkles', appointmentTypes: ['Consultation', 'Treatment'], consultationTemplate: 'common', active: true, dictionaryScopes: ['symptoms', 'ayurveda-concept'] },
  { id: 'dep_diet', name: 'Diet & Nutrition', type: 'wellness', head: 'Ms. Anjali Pillai', code: 'DIET', category: 'wellness', color: 'rose', icon: 'Apple', appointmentTypes: ['Consultation', 'Follow-up'], consultationTemplate: 'common', active: true, dictionaryScopes: ['symptoms', 'vital'] },
  { id: 'dep_diag', name: 'Diagnostics', type: 'support', head: 'Dr. Hari Krishnan', code: 'DIAG', category: 'support', color: 'slate', icon: 'FlaskConical', appointmentTypes: ['Sample Collection', 'Result Review'], consultationTemplate: 'common', active: true, dictionaryScopes: ['vital', 'procedure'] },
  { id: 'dep_pancha', name: 'Panchakarma', type: 'ayurveda', head: 'usr_doc', code: 'PANCH', category: 'ayurveda', color: 'green', icon: 'Flower2', appointmentTypes: ['Therapy Session', 'Consultation', 'Follow-up'], consultationTemplate: 'ayurveda', active: true, dictionaryScopes: ['panchakarma-therapy', 'ayurveda-concept', 'diagnosis-ayurveda', 'symptoms', 'advice-template', 'discharge-template'] },
]

// Demo accounts — one per role. Passwords illustrative only.
export const users = [
  { id: 'usr_admin', name: 'Ravi Shankar', email: 'admin@palikutty.in', role: 'admin', department: 'Administration', password: 'admin123', status: 'active' },
  { id: 'usr_mgmt', name: 'Latha Menon', email: 'management@palikutty.in', role: 'management', department: 'Management', password: 'manage123', status: 'active' },
  { id: 'usr_doc', name: 'Dr. Anand Varma', email: 'doctor@palikutty.in', role: 'doctor', department: 'Ayurveda', password: 'doctor123', status: 'active' },
  { id: 'usr_doc2', name: 'Dr. Reema Joseph', email: 'reema@palikutty.in', role: 'doctor', department: 'Allopathy', password: 'doctor123', status: 'active' },
  { id: 'usr_nurse', name: 'Sister Mary Thomas', email: 'nurse@palikutty.in', role: 'nurse', department: 'IPD Nursing', password: 'nurse123', status: 'active' },
  { id: 'usr_recep', name: 'Sneha Kurup', email: 'reception@palikutty.in', role: 'reception', department: 'Front Desk', password: 'reception123', status: 'active' },
  { id: 'usr_pharm', name: 'Manoj Pillai', email: 'pharmacy@palikutty.in', role: 'pharmacy', department: 'Pharmacy', password: 'pharma123', status: 'active' },
  { id: 'usr_lab', name: 'Divya Raj', email: 'lab@palikutty.in', role: 'lab', department: 'Diagnostics', password: 'lab123', status: 'active' },
  { id: 'usr_fin', name: 'George Mathew', email: 'finance@palikutty.in', role: 'finance', department: 'Finance', password: 'finance123', status: 'active' },
  { id: 'usr_it', name: 'Arun Nambiar', email: 'it@palikutty.in', role: 'it', department: 'IT', password: 'it123', status: 'active' },
  { id: 'usr_dentist', name: 'Dr. Naseem Ali', email: 'dentist@palikutty.in', role: 'dentist', department: 'Dental', password: 'dentist123', status: 'active' },
  { id: 'usr_physio', name: 'Dr. Vishnu Prasad', email: 'physio@palikutty.in', role: 'physiotherapist', department: 'Physiotherapy', password: 'physio123', status: 'active' },
]

export const doctors = [
  { id: 'usr_doc', name: 'Dr. Anand Varma', department: 'Ayurveda', specialty: 'Panchakarma & Lifestyle' },
  { id: 'usr_doc2', name: 'Dr. Reema Joseph', department: 'Allopathy', specialty: 'General Medicine' },
  { id: 'doc_dental', name: 'Dr. Faisal Rahman', department: 'Dental', specialty: 'Oral & Maxillofacial' },
  { id: 'doc_physio', name: 'Dr. Kavya Nair', department: 'Physiotherapy', specialty: 'Musculoskeletal Rehab' },
  { id: 'doc_beauty', name: 'Dr. Priya Sasi', department: 'Ayur Beauty Clinic', specialty: 'Dermatology & Beauty' },
]

export const nurses = [
  { id: 'usr_nurse', name: 'Sister Mary Thomas', ward: 'Ayurveda Ward' },
  { id: 'nrs_2', name: 'Sister Aaliya Noor', ward: 'General Medicine Ward' },
  { id: 'nrs_3', name: 'Sister Rekha Pillai', ward: 'Panchakarma Recovery' },
]

// Master patient records. preferredLanguage: en | ar | bilingual
export const patients = [
  { id: 'pat_1', mrn: 'MRN-0001', name: 'Aishwarya Pillai', nameAr: '', age: 34, gender: 'Female', phone: '98470 11221', address: 'Changuvetty, Kottakkal', department: 'Ayurveda', bloodGroup: 'B+', allergies: 'None', condition: 'Chronic lower-back pain', registeredOn: daysFromNow(-40), status: 'active', preferredLanguage: 'en', diagnosisAr: '', treatmentAr: '' },
  { id: 'pat_2', mrn: 'MRN-0002', name: 'Mohammed Ashraf', nameAr: 'محمد أشرف', age: 52, gender: 'Male', phone: '98470 33445', address: 'Edarikode, Malappuram', department: 'Allopathy', bloodGroup: 'O+', allergies: 'Penicillin', condition: 'Type-2 Diabetes', registeredOn: daysFromNow(-30), status: 'active', preferredLanguage: 'ar', diagnosisAr: 'داء السكري من النوع الثاني', treatmentAr: 'ضبط الحمية مع علاج أيورفيدا مساعد ومتابعة منتظمة.' },
  { id: 'pat_3', mrn: 'MRN-0003', name: 'Sarah Thomas', nameAr: '', age: 28, gender: 'Female', phone: '90370 55667', address: 'Tirur, Malappuram', department: 'Ayur Beauty Clinic', bloodGroup: 'A+', allergies: 'None', condition: 'Psoriasis', registeredOn: daysFromNow(-12), status: 'active', preferredLanguage: 'en', diagnosisAr: '', treatmentAr: '' },
  { id: 'pat_4', mrn: 'MRN-0004', name: 'Krishnan Nair', nameAr: '', age: 61, gender: 'Male', phone: '94470 77889', address: 'Vengara, Malappuram', department: 'Physiotherapy', bloodGroup: 'AB+', allergies: 'None', condition: 'Post-stroke rehab', registeredOn: daysFromNow(-20), status: 'active', preferredLanguage: 'en', diagnosisAr: '', treatmentAr: '' },
  { id: 'pat_5', mrn: 'MRN-0005', name: 'Fathima Beevi', nameAr: 'فاطمة بيبي', age: 45, gender: 'Female', phone: '99950 22113', address: 'Kottakkal Town', department: 'Panchakarma', bloodGroup: 'O-', allergies: 'Lactose', condition: 'PCOD / weight management', registeredOn: daysFromNow(-8), status: 'active', preferredLanguage: 'bilingual', diagnosisAr: 'متلازمة تكيس المبايض وإدارة الوزن', treatmentAr: 'برنامج بانشاكارما مع تعديل النظام الغذائي.' },
  { id: 'pat_6', mrn: 'MRN-0006', name: 'Joseph Varghese', nameAr: '', age: 39, gender: 'Male', phone: '97450 88221', address: 'Manjeri, Malappuram', department: 'Dental', bloodGroup: 'B-', allergies: 'None', condition: 'Root canal follow-up', registeredOn: daysFromNow(-2), status: 'active', preferredLanguage: 'en', diagnosisAr: '', treatmentAr: '' },
  { id: 'pat_7', mrn: 'MRN-0007', name: 'Abdul Rahman Al Balushi', nameAr: 'عبدالرحمن البلوشي', age: 58, gender: 'Male', phone: '97120 44556', address: 'Muscat (visiting Kottakkal)', department: 'Ayurveda', bloodGroup: 'A+', allergies: 'None', condition: 'Lumbar spondylosis + sciatica', registeredOn: daysFromNow(-16), status: 'active', preferredLanguage: 'ar', diagnosisAr: 'انزلاق غضروفي قطني مع عرق النسا', treatmentAr: 'برنامج بانشاكارما داخلي يشمل العلاج بالزيوت والكيزهي مع المتابعة.' },
]

// OPD visits + IPD admissions. type: 'OPD' | 'IPD'
// status (OPD): open | closed ; (IPD): admitted | discharged
export const episodes = [
  // pat_1 — multiple OPD visits (Scenario: repeat OPD)
  { id: 'ep_1a', patientId: 'pat_1', mrn: 'MRN-0001', type: 'OPD', refNo: 'OPD-0001-01', date: daysFromNow(-40), department: 'Ayurveda', doctorId: 'usr_doc', reason: 'Initial back pain assessment', status: 'closed' },
  { id: 'ep_1b', patientId: 'pat_1', mrn: 'MRN-0001', type: 'OPD', refNo: 'OPD-0001-02', date: daysFromNow(-12), department: 'Ayurveda', doctorId: 'usr_doc', reason: 'Abhyanga review', status: 'closed' },
  { id: 'ep_1c', patientId: 'pat_1', mrn: 'MRN-0001', type: 'OPD', refNo: 'OPD-0001-03', date: today(), department: 'Ayurveda', doctorId: 'usr_doc', reason: 'Follow-up', status: 'open' },

  { id: 'ep_2a', patientId: 'pat_2', mrn: 'MRN-0002', type: 'OPD', refNo: 'OPD-0002-01', date: daysFromNow(-30), department: 'Allopathy', doctorId: 'usr_doc2', reason: 'Diabetic review', status: 'closed' },

  // pat_4 — converted OPD → IPD (Scenario 3), same MRN
  { id: 'ep_4a', patientId: 'pat_4', mrn: 'MRN-0004', type: 'OPD', refNo: 'OPD-0004-01', date: daysFromNow(-20), department: 'Physiotherapy', doctorId: 'doc_physio', reason: 'Post-stroke assessment', status: 'closed' },
  { id: 'ep_4b', patientId: 'pat_4', mrn: 'MRN-0004', type: 'IPD', refNo: 'IPD-0004-01', date: daysFromNow(-6), department: 'General Medicine', doctorId: 'usr_doc2', nurseId: 'nrs_2', bedId: 'bed_gm2', ward: 'General Medicine Ward', admitDate: daysFromNow(-6), expectedDischarge: daysFromNow(2), diagnosis: 'Post-stroke rehabilitation, needs inpatient monitoring', reason: 'Inpatient rehab & monitoring', advance: 10000, status: 'admitted', convertedFrom: 'ep_4a',
    clearance: {
      clinical: { done: true, by: 'Dr. Reema Joseph', at: daysFromNow(0) },
      nursing: { done: false, by: null, at: null },
      pharmacy: { done: false, by: null, at: null },
      lab: { done: false, by: null, at: null },
      billing: { done: false, by: null, at: null },
      documents: { done: false, by: null, at: null },
      override: null,
    } },

  // pat_7 — active IPD Panchakarma inpatient (Arabic) (Scenario 4 + 6)
  { id: 'ep_7a', patientId: 'pat_7', mrn: 'MRN-0007', type: 'OPD', refNo: 'OPD-0007-01', date: daysFromNow(-16), department: 'Ayurveda', doctorId: 'usr_doc', reason: 'Spondylosis consultation', status: 'closed' },
  { id: 'ep_7b', patientId: 'pat_7', mrn: 'MRN-0007', type: 'IPD', refNo: 'IPD-0007-01', date: daysFromNow(-5), department: 'Panchakarma', doctorId: 'usr_doc', nurseId: 'nrs_3', bedId: 'bed_pr1', ward: 'Panchakarma Recovery', admitDate: daysFromNow(-5), expectedDischarge: daysFromNow(9), diagnosis: 'Lumbar spondylosis — 14-day Panchakarma protocol', reason: 'Residential Panchakarma programme', advance: 25000, status: 'admitted' },

  // pat_5 — discharged IPD with bed transfer history (Scenario: discharged + transfer)
  { id: 'ep_5a', patientId: 'pat_5', mrn: 'MRN-0005', type: 'IPD', refNo: 'IPD-0005-01', date: daysFromNow(-15), department: 'Panchakarma', doctorId: 'usr_doc', nurseId: 'nrs_3', bedId: null, ward: 'Deluxe Rooms', admitDate: daysFromNow(-15), expectedDischarge: daysFromNow(-9), dischargeDate: daysFromNow(-9), diagnosis: 'PCOD — detox & weight programme', reason: 'Panchakarma detox', advance: 15000, status: 'discharged',
    transfers: [
      { from: 'Semi-private Rooms', to: 'Deluxe Rooms', date: daysFromNow(-12), reason: 'Patient upgrade request' },
    ] },
]

// Ward / room / bed inventory. status: available | occupied | cleaning | maintenance | reserved
export const beds = [
  { id: 'bed_ay1', ward: 'Ayurveda Ward', room: 'A-101', bedNo: 'A1', status: 'available', patientId: null, episodeId: null },
  { id: 'bed_ay2', ward: 'Ayurveda Ward', room: 'A-101', bedNo: 'A2', status: 'cleaning', patientId: null, episodeId: null },
  { id: 'bed_gm1', ward: 'General Medicine Ward', room: 'G-201', bedNo: 'G1', status: 'available', patientId: null, episodeId: null },
  { id: 'bed_gm2', ward: 'General Medicine Ward', room: 'G-201', bedNo: 'G2', status: 'occupied', patientId: 'pat_4', episodeId: 'ep_4b' },
  { id: 'bed_pr1', ward: 'Panchakarma Recovery', room: 'P-301', bedNo: 'P1', status: 'occupied', patientId: 'pat_7', episodeId: 'ep_7b' },
  { id: 'bed_pr2', ward: 'Panchakarma Recovery', room: 'P-301', bedNo: 'P2', status: 'reserved', patientId: null, episodeId: null },
  { id: 'bed_dx1', ward: 'Deluxe Rooms', room: 'D-401', bedNo: 'D1', status: 'available', patientId: null, episodeId: null },
  { id: 'bed_dx2', ward: 'Deluxe Rooms', room: 'D-402', bedNo: 'D1', status: 'maintenance', patientId: null, episodeId: null },
  { id: 'bed_sp1', ward: 'Semi-private Rooms', room: 'S-501', bedNo: 'S1', status: 'available', patientId: null, episodeId: null },
  { id: 'bed_sp2', ward: 'Semi-private Rooms', room: 'S-501', bedNo: 'S2', status: 'available', patientId: null, episodeId: null },
  { id: 'bed_ob1', ward: 'Observation Beds', room: 'O-001', bedNo: 'O1', status: 'available', patientId: null, episodeId: null },
  { id: 'bed_ob2', ward: 'Observation Beds', room: 'O-001', bedNo: 'O2', status: 'available', patientId: null, episodeId: null },
]

export const consultations = [
  { id: 'con_1', patientId: 'pat_4', doctorId: 'doc_physio', episodeId: 'ep_4a', appointmentId: 'apt_4', date: daysFromNow(-20), notes: 'Improved balance vs last week. Able to walk 20m with support.', diagnosis: 'Hemiparesis, recovering — post-stroke', treatment: 'Continue gait training, add resistance band routine x2 daily.', status: 'completed',
    chiefComplaint: 'Weakness on right side, difficulty walking unaided.',
    vitalsSnapshot: { bp: '128/82', pulse: 78, temp: 36.8, rr: 16, spo2: 98, weight: 71, height: 170, bmi: 24.6 },
    allergyConfirmed: true, allergyConfirmedBy: 'Dr. Kavya Nair', allergyConfirmedAt: daysFromNow(-20),
    followUpDate: daysFromNow(-13), referral: null, consentRequired: false, consentLinked: null,
  },
  { id: 'con_2', patientId: 'pat_2', doctorId: 'usr_doc2', episodeId: 'ep_2a', appointmentId: null, date: daysFromNow(-30), notes: 'HbA1c 8.1. Advised dietary control + Ayurvedic adjunct.', diagnosis: 'Type-2 Diabetes Mellitus', treatment: 'Metformin 500mg BD; review in 2 weeks.', status: 'completed',
    chiefComplaint: 'Increased thirst, fatigue, routine diabetes review.',
    vitalsSnapshot: { bp: '146/92', pulse: 88, temp: 37.0, rr: 18, spo2: 97, weight: 84, height: 172, bmi: 28.4 },
    allergyConfirmed: true, allergyConfirmedBy: 'Dr. Reema Joseph', allergyConfirmedAt: daysFromNow(-30),
    followUpDate: daysFromNow(-16), referral: null, consentRequired: false, consentLinked: null,
  },
  { id: 'con_3', patientId: 'pat_7', doctorId: 'usr_doc', episodeId: 'ep_7a', appointmentId: null, date: daysFromNow(-16), notes: 'MRI shows L4-L5 disc bulge. Candidate for Panchakarma protocol.', diagnosis: 'Lumbar spondylosis with sciatica', treatment: 'Admit for 14-day residential Panchakarma: Abhyanga, Kizhi, Kati Basti.', status: 'completed',
    chiefComplaint: 'Chronic low back pain radiating to right leg, worse on sitting.',
    vitalsSnapshot: { bp: '132/84', pulse: 74, temp: 36.7, rr: 16, spo2: 98, weight: 79, height: 174, bmi: 26.1 },
    allergyConfirmed: true, allergyConfirmedBy: 'Dr. Anand Varma', allergyConfirmedAt: daysFromNow(-16),
    followUpDate: daysFromNow(-2), referral: null, consentRequired: true, consentLinked: null,
    // Ayurveda-specific block
    nadi: 'Vata-Pitta, irregular', prakriti: 'Vata-Pitta', vikriti: 'Vata predominant (Vata vriddhi in Asthi/Majja dhatu)',
    samprapti: 'Vata prakopa in Kati pradesha leading to Asthi-Majja dhatu kshaya, causing Gridhrasi (sciatica-like presentation).',
    samprapliGhataka: 'Dosha: Vata (Asthi/Majja); Dushya: Asthi, Majja, Snayu; Srotas: Asthivaha; Agni: Manda',
    balaAssessment: 'Madhyama bala — moderate strength, fit for Shodhana with Purvakarma preparation.',
    chikitsaSutra: 'Vata-shamana with Snehana, Swedana followed by Basti-pradhana Panchakarma (Kati Basti, Abhyanga, Ela Kizhi).',
    anupana: 'Lukewarm water / Dashamoola Kashaya as anupana for internal medications.',
    therapyAdvice: { procedures: ['Abhyanga', 'Ela Kizhi', 'Kati Basti'], notes: '14-day residential Panchakarma protocol; reassess after Purvakarma phase before considering Virechana.' },
    pathyaApathya: { pathya: 'Warm, light, easily digestible food; Vata-pacifying diet (cooked vegetables, warm soups, ghee in moderation); adequate rest.', apathya: 'Cold/dry/stale food, excessive travel, prolonged sitting, daytime sleep, heavy exertion.' },
  },
]

export const prescriptions = [
  { id: 'rx_1', patientId: 'pat_2', consultationId: 'con_2', doctorId: 'usr_doc2', createdOn: daysFromNow(-30), status: 'dispensed', items: [
      { medicineId: 'med_3', name: 'Metformin 500mg', dosage: '1-0-1 after food', qty: 60 },
      { medicineId: 'med_5', name: 'Madhunashini Vati', dosage: '1-0-1', qty: 60 },
    ] },
  { id: 'rx_2', patientId: 'pat_4', consultationId: 'con_1', doctorId: 'doc_physio', createdOn: daysFromNow(-6), status: 'pending', items: [
      { medicineId: 'med_6', name: 'Dhanwantharam Thailam', dosage: 'External application', qty: 2 },
    ] },
  { id: 'rx_3', patientId: 'pat_7', consultationId: 'con_3', doctorId: 'usr_doc', createdOn: daysFromNow(-5), status: 'pending', items: [
      { medicineId: 'med_8', name: 'Ksheerabala 101', dosage: '10 drops twice daily', qty: 2 },
      { medicineId: 'med_1', name: 'Ashwagandha Churna', dosage: '1 tsp at bedtime', qty: 1 },
    ] },
]

export const medicines = [
  { id: 'med_1', name: 'Ashwagandha Churna', category: 'ayurveda', unit: 'bottle', stock: 64, reorderLevel: 20, price: 180, expiry: daysFromNow(420) },
  { id: 'med_2', name: 'Triphala Tablets', category: 'ayurveda', unit: 'strip', stock: 12, reorderLevel: 25, price: 95, expiry: daysFromNow(300) },
  { id: 'med_3', name: 'Metformin 500mg', category: 'modern', unit: 'strip', stock: 140, reorderLevel: 40, price: 32, expiry: daysFromNow(500) },
  { id: 'med_4', name: 'Paracetamol 650mg', category: 'modern', unit: 'strip', stock: 8, reorderLevel: 30, price: 22, expiry: daysFromNow(260) },
  { id: 'med_5', name: 'Madhunashini Vati', category: 'ayurveda', unit: 'bottle', stock: 38, reorderLevel: 15, price: 240, expiry: daysFromNow(380) },
  { id: 'med_6', name: 'Dhanwantharam Thailam', category: 'ayurveda', unit: 'bottle', stock: 27, reorderLevel: 10, price: 320, expiry: daysFromNow(450) },
  { id: 'med_7', name: 'Amoxicillin 500mg', category: 'modern', unit: 'strip', stock: 5, reorderLevel: 20, price: 78, expiry: daysFromNow(180) },
  { id: 'med_8', name: 'Ksheerabala 101', category: 'ayurveda', unit: 'bottle', stock: 41, reorderLevel: 12, price: 410, expiry: daysFromNow(500) },
]

export const labTests = [
  { id: 'lab_1', patientId: 'pat_2', doctorId: 'usr_doc2', episodeId: 'ep_2a', testName: 'HbA1c', department: 'Diagnostics', requestedOn: daysFromNow(-29), sampleStatus: 'collected', status: 'completed', result: 'HbA1c 8.1% — above target.' },
  { id: 'lab_2', patientId: 'pat_5', doctorId: 'usr_doc', episodeId: null, testName: 'Lipid Profile', department: 'Diagnostics', requestedOn: daysFromNow(-7), sampleStatus: 'collected', status: 'in-progress', result: '' },
  { id: 'lab_3', patientId: 'pat_7', doctorId: 'usr_doc', episodeId: 'ep_7b', testName: 'Vitamin D', department: 'Diagnostics', requestedOn: daysFromNow(-4), sampleStatus: 'pending', status: 'requested', result: '' },
]

// Vitals — nurse-entered (Phase 6)
export const vitals = [
  { id: 'vit_1', patientId: 'pat_4', episodeId: 'ep_4b', nurseId: 'nrs_2', recordedAt: daysFromNow(-1), temp: '98.6', bp: '130/85', pulse: '78', spo2: '97', resp: '18', sugar: '142', notes: 'Stable overnight.' },
  { id: 'vit_2', patientId: 'pat_7', episodeId: 'ep_7b', nurseId: 'nrs_3', recordedAt: daysFromNow(-1), temp: '98.2', bp: '128/82', pulse: '72', spo2: '98', resp: '16', sugar: '110', notes: 'Comfortable post-Abhyanga.' },
  { id: 'vit_3', patientId: 'pat_7', episodeId: 'ep_7b', nurseId: 'nrs_3', recordedAt: today(), temp: '98.4', bp: '126/80', pulse: '70', spo2: '99', resp: '16', sugar: '105', notes: 'Good progress.' },
]

// Nursing notes + medication administration (Phase 6)
export const nursingNotes = [
  { id: 'nn_1', patientId: 'pat_7', episodeId: 'ep_7b', nurseId: 'nrs_3', date: daysFromNow(-1), note: 'Assisted with morning therapy prep. Tolerated Abhyanga well.', medication: 'Ksheerabala 101', medStatus: 'given' },
  { id: 'nn_2', patientId: 'pat_4', episodeId: 'ep_4b', nurseId: 'nrs_2', date: today(), note: 'Physiotherapy session attended. Mild fatigue after.', medication: 'Dhanwantharam Thailam', medStatus: 'pending' },
]

// Panchakarma / Ayurveda therapy sessions (Phase 7)
export const therapies = [
  { id: 'th_1', patientId: 'pat_7', episodeId: 'ep_7b', type: 'Abhyanga', therapistId: 'usr_doc', date: daysFromNow(-4), status: 'completed', cost: 1500, notes: 'Full-body warm oil massage. Sesame + Dhanwantharam.', instructionsAr: 'تدليك كامل للجسم بالزيت الدافئ مع الراحة بعده.' },
  { id: 'th_2', patientId: 'pat_7', episodeId: 'ep_7b', type: 'Kizhi', therapistId: 'usr_doc', date: daysFromNow(-2), status: 'completed', cost: 1800, notes: 'Podikizhi over lumbar region.', instructionsAr: 'كمادات عشبية ساخنة على أسفل الظهر.' },
  { id: 'th_3', patientId: 'pat_7', episodeId: 'ep_7b', type: 'Kati Basti', therapistId: 'usr_doc', date: today(), status: 'in-progress', cost: 2000, notes: 'Medicated oil pool over lower back.', instructionsAr: 'تجمع الزيت الطبي على أسفل الظهر.' },
  { id: 'th_4', patientId: 'pat_5', episodeId: 'ep_5a', type: 'Virechana', therapistId: 'usr_doc', date: daysFromNow(-12), status: 'completed', cost: 2500, notes: 'Therapeutic purgation — detox phase.', instructionsAr: '' },
  { id: 'th_5', patientId: 'pat_1', episodeId: 'ep_1b', type: 'Shirodhara', therapistId: 'usr_doc', date: daysFromNow(-12), status: 'completed', cost: 1700, notes: 'Continuous oil stream on forehead.', instructionsAr: '' },
  { id: 'th_6', patientId: 'pat_7', episodeId: 'ep_7b', type: 'Nasya', therapistId: 'usr_doc', date: daysFromNow(1), status: 'scheduled', cost: 900, notes: 'Nasal medication scheduled.', instructionsAr: '' },
]

export const appointments = [
  { id: 'apt_1', patientId: 'pat_1', doctorId: 'usr_doc', department: 'Ayurveda', date: today(), time: '09:30', reason: 'Abhyanga review & back pain', status: 'scheduled' },
  { id: 'apt_2', patientId: 'pat_2', doctorId: 'usr_doc2', department: 'Allopathy', date: today(), time: '10:15', reason: 'Diabetic follow-up', status: 'scheduled' },
  { id: 'apt_3', patientId: 'pat_3', doctorId: 'doc_beauty', department: 'Ayur Beauty Clinic', date: today(), time: '11:00', reason: 'Psoriasis consultation', status: 'pending' },
  { id: 'apt_4', patientId: 'pat_4', doctorId: 'doc_physio', department: 'Physiotherapy', date: daysFromNow(-1), time: '15:30', reason: 'Gait training session', status: 'completed' },
  { id: 'apt_5', patientId: 'pat_6', doctorId: 'doc_dental', department: 'Dental', date: daysFromNow(1), time: '12:00', reason: 'Crown fitting', status: 'scheduled' },
]

// Bills now carry: billType, episodeId/ref, discountType/Value, gstRate, breakdown, paymentMethod.
export const bills = [
  // Completed, paid, with GST (Scenario 1)
  { id: 'bill_1', invoiceNo: 'INV-0001', patientId: 'pat_2', episodeId: 'ep_2a', billType: 'OPD', department: 'Allopathy', doctorId: 'usr_doc2', date: daysFromNow(-30), status: 'paid', paymentMethod: 'Card',
    items: [
      { desc: 'Consultation — General Medicine', qty: 1, rate: 400 },
      { desc: 'HbA1c test', qty: 1, rate: 450 },
      { desc: 'Pharmacy', qty: 1, rate: 380 },
    ],
    discountType: 'none', discountValue: 0, gstRate: 5, paidAmount: 1291.5, total: 1291.5 },

  // Partially paid IPD with percentage discount (Scenario: partial + discount)
  { id: 'bill_2', invoiceNo: 'INV-0002', patientId: 'pat_4', episodeId: 'ep_4b', billType: 'IPD', department: 'General Medicine', doctorId: 'usr_doc2', date: daysFromNow(-1), status: 'partial', paymentMethod: 'Cash',
    items: [
      { desc: 'IPD bed charges (5 days)', qty: 5, rate: 1200 },
      { desc: 'Physiotherapy sessions', qty: 3, rate: 700 },
      { desc: 'Nursing care', qty: 5, rate: 300 },
    ],
    discountType: 'percent', discountValue: 10, gstRate: 5, paidAmount: 5000, total: 9072 },

  // Pending OPD bill, no discount (Scenario: pending)
  { id: 'bill_3', invoiceNo: 'INV-0003', patientId: 'pat_3', episodeId: null, billType: 'OPD', department: 'Ayur Beauty Clinic', doctorId: 'doc_beauty', date: today(), status: 'pending', paymentMethod: '',
    items: [{ desc: 'Skin consultation', qty: 1, rate: 350 }],
    discountType: 'none', discountValue: 0, gstRate: 0, paidAmount: 0, total: 350 },

  // Arabic-preferred patient, Panchakarma IPD, fixed discount (Scenario 6)
  { id: 'bill_4', invoiceNo: 'INV-0004', patientId: 'pat_7', episodeId: 'ep_7b', billType: 'IPD', department: 'Panchakarma', doctorId: 'usr_doc', date: daysFromNow(-1), status: 'partial', paymentMethod: 'Card',
    items: [
      { desc: 'Panchakarma residential (5 days)', qty: 5, rate: 3500 },
      { desc: 'Abhyanga therapy', qty: 1, rate: 1500 },
      { desc: 'Kizhi therapy', qty: 1, rate: 1800 },
      { desc: 'Kati Basti', qty: 1, rate: 2000 },
    ],
    discountType: 'fixed', discountValue: 2000, gstRate: 5, paidAmount: 15000, total: 21840 },
]

import { pricing, billableItems, tasks, approvals, audit, snapshots } from './workflowSeed'
import { clinicalTerms } from './clinicalDictionary'

export const buildInitialState = () => ({
  departments, users, doctors, nurses,
  patients, episodes, beds,
  appointments, consultations, prescriptions,
  medicines, labTests,
  vitals, nursingNotes, therapies,
  bills,
  pricing, billableItems, tasks, approvals, audit, snapshots,
  clinicalTerms,
  meta: { seededAt: new Date().toISOString(), version: 3, product: 'ArogyaFlow' },
})
