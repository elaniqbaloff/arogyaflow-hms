// ─────────────────────────────────────────────────────────────
// Bilingual label dictionary (English + Arabic).
//
// Used by patient-facing printable documents (invoices, receipts,
// summaries). Internal/admin UI stays in English. Arabic strings
// are demo translations — in production they should be reviewed by
// staff, especially medical terms.
//
// Usage:  t('invoice', 'ar')  ·  t('invoice')  ·  L.patientName
// ─────────────────────────────────────────────────────────────

export const DICT = {
  // Document titles
  invoice: { en: 'Invoice', ar: 'فاتورة' },
  receipt: { en: 'Payment Receipt', ar: 'إيصال دفع' },
  patientSummary: { en: 'Patient Summary', ar: 'ملخص المريض' },
  treatmentSummary: { en: 'Treatment Summary', ar: 'ملخص العلاج' },
  dischargeSummary: { en: 'Discharge Summary', ar: 'ملخص الخروج' },
  therapyPlan: { en: 'Panchakarma Therapy Plan', ar: 'خطة علاج البانشاكarma' },
  consentForm: { en: 'Informed Consent Form', ar: 'نموذج الموافقة المستنيرة' },

  // Patient + reference fields
  patientName: { en: 'Patient Name', ar: 'اسم المريض' },
  mrn: { en: 'MRN', ar: 'رقم الملف الطبي' },
  reference: { en: 'Reference No.', ar: 'رقم المرجع' },
  date: { en: 'Date', ar: 'التاريخ' },
  department: { en: 'Department', ar: 'القسم' },
  doctor: { en: 'Doctor', ar: 'الطبيب' },
  ward: { en: 'Ward', ar: 'الجناح' },
  bed: { en: 'Bed', ar: 'السرير' },
  age: { en: 'Age', ar: 'العمر' },
  gender: { en: 'Gender', ar: 'الجنس' },
  phone: { en: 'Phone', ar: 'الهاتف' },

  // Clinical
  diagnosis: { en: 'Diagnosis', ar: 'التشخيص' },
  treatmentPlan: { en: 'Treatment Plan', ar: 'خطة العلاج' },
  followUp: { en: 'Follow-up Instructions', ar: 'تعليمات المتابعة' },
  medicine: { en: 'Medicine', ar: 'الدواء' },
  dosage: { en: 'Dosage', ar: 'الجرعة' },
  therapy: { en: 'Therapy', ar: 'العلاج' },
  procedure: { en: 'Procedure', ar: 'الإجراء' },
  tooth: { en: 'Tooth', ar: 'السن' },
  procedureDescription: { en: 'Description of Procedure', ar: 'وصف الإجراء' },
  risksTitle: { en: 'Risks & Complications', ar: 'المخاطر والمضاعفات' },
  alternativesTitle: { en: 'Alternatives', ar: 'البدائل' },
  consentStatementTitle: { en: 'Patient Consent Statement', ar: 'بيان موافقة المريض' },
  consentStatementBody: {
    en: 'I confirm that the procedure, its risks, benefits, and alternatives have been explained to me in a language I understand, that I have had the opportunity to ask questions, and that I voluntarily consent to the procedure named on this form.',
    ar: 'أؤكد أنه تم شرح الإجراء ومخاطره وفوائده وبدائله لي بلغة أفهمها، وأنه أُتيحت لي الفرصة لطرح الأسئلة، وأنني أوافق طوعاً على الإجراء المذكور في هذا النموذج.',
  },
  patientGuardianSignature: { en: 'Patient / Guardian Signature', ar: 'توقيع المريض / ولي الأمر' },
  staffAttestation: { en: 'Staff Attestation', ar: 'إقرار الموظف' },

  // Billing
  description: { en: 'Description', ar: 'الوصف' },
  quantity: { en: 'Qty', ar: 'الكمية' },
  rate: { en: 'Rate', ar: 'السعر' },
  amount: { en: 'Amount', ar: 'المبلغ' },
  subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي' },
  discount: { en: 'Discount', ar: 'الخصم' },
  taxable: { en: 'Taxable Amount', ar: 'المبلغ الخاضع للضريبة' },
  gst: { en: 'GST / Tax', ar: 'ضريبة القيمة المضافة' },
  grandTotal: { en: 'Grand Total', ar: 'الإجمالي الكلي' },
  paidAmount: { en: 'Paid Amount', ar: 'المبلغ المدفوع' },
  balanceDue: { en: 'Balance Due', ar: 'المبلغ المستحق' },
  paymentStatus: { en: 'Payment Status', ar: 'حالة الدفع' },
  paymentMethod: { en: 'Payment Method', ar: 'طريقة الدفع' },

  // Statuses
  paid: { en: 'Paid', ar: 'مدفوع' },
  partial: { en: 'Partially Paid', ar: 'مدفوع جزئياً' },
  pending: { en: 'Pending', ar: 'معلق' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },

  // Footer / signatures
  authorizedSignature: { en: 'Authorized Signature', ar: 'التوقيع المعتمد' },
  generatedOn: { en: 'Generated on', ar: 'تم الإنشاء في' },
  preparedBy: { en: 'Prepared by', ar: 'أعدّ بواسطة' },
  thankYou: { en: 'Thank you for choosing our hospital.', ar: 'شكراً لاختياركم مستشفانا.' },
  demoNote: {
    en: 'Demo document — Arabic text is a helper translation and should be staff-reviewed.',
    ar: 'مستند تجريبي — النص العربي ترجمة مساعدة ويجب مراجعته من قبل الموظفين.',
  },

  // Hospital identity
  hospitalName: {
    en: "Dr. P. Alikutty's Ayurveda & Modern Hospital",
    ar: 'مستشفى الدكتور ب. آليكوتي للأيورفيدا والطب الحديث',
  },
  hospitalAddress: {
    en: 'NH-66, Changuvetty, Kottakkal, Malappuram — 676 501, Kerala, India',
    ar: 'الطريق الوطني 66، تشانغوفيتي، كوتاكال، مالابورام — 676501، كيرالا، الهند',
  },
}

export const LANGS = {
  en: { label: 'English', dir: 'ltr' },
  ar: { label: 'العربية', dir: 'rtl' },
  bilingual: { label: 'Bilingual', dir: 'ltr' },
}

// Translate a key into a language. Falls back to English, then the key itself.
export const t = (key, lang = 'en') => {
  const entry = DICT[key]
  if (!entry) return key
  if (lang === 'ar') return entry.ar || entry.en
  return entry.en
}

// For bilingual labels: "English / Arabic"
export const tb = (key) => {
  const entry = DICT[key]
  if (!entry) return key
  return `${entry.en} / ${entry.ar}`
}
