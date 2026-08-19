// ─────────────────────────────────────────────────────────────
// Bilingual consent-form content per dental procedure class (§9.6).
// Demo copy, same disclaimer as every other Arabic/legal document in
// this app — must be reviewed by clinical/legal staff before real use.
// ─────────────────────────────────────────────────────────────

export const CONSENT_TEMPLATES = {
  extraction: {
    label: { en: 'Tooth Extraction', ar: 'خلع السن' },
    procedureDesc: {
      en: 'Surgical or simple removal of the affected tooth under local anesthesia.',
      ar: 'إزالة السن المصاب جراحياً أو ببساطة تحت التخدير الموضعي.',
    },
    risks: {
      en: 'Bleeding, swelling, infection, dry socket, temporary or (rarely) permanent numbness of the lip/tongue/chin, damage to adjacent teeth, need for further surgical intervention.',
      ar: 'النزيف، التورم، العدوى، التهاب السنخ الجاف، تنميل مؤقت أو دائم (نادراً) في الشفة/اللسان/الذقن، تلف الأسنان المجاورة، الحاجة إلى تدخل جراحي إضافي.',
    },
    alternatives: {
      en: 'Root canal treatment (if the tooth is restorable), no treatment (with risk of worsening infection or pain), referral to an oral surgeon.',
      ar: 'علاج قناة الجذر (إذا كان السن قابلاً للترميم)، عدم العلاج (مع خطر تفاقم العدوى أو الألم)، الإحالة إلى جراح الفم.',
    },
  },
  rootCanal: {
    label: { en: 'Root Canal Treatment', ar: 'علاج قناة الجذر' },
    procedureDesc: {
      en: 'Removal of infected or inflamed pulp tissue, cleaning and shaping of the root canal system, and obturation — typically followed by a crown.',
      ar: 'إزالة أنسجة اللب الملتهبة أو المصابة، وتنظيف وتشكيل نظام قناة الجذر، وحشوها — ويتبع ذلك عادةً تركيب تاج.',
    },
    risks: {
      en: 'Instrument separation, missed or extra canals, post-treatment pain or swelling, re-infection requiring retreatment or extraction, the tooth may need a crown to prevent fracture.',
      ar: 'انكسار الأداة، قنوات مفقودة أو إضافية، ألم أو تورم بعد العلاج، إعادة العدوى قد تتطلب إعادة العلاج أو الخلع، وقد يحتاج السن إلى تاج لمنع الكسر.',
    },
    alternatives: {
      en: 'Tooth extraction, no treatment (with risk of worsening infection or abscess).',
      ar: 'خلع السن، عدم العلاج (مع خطر تفاقم العدوى أو الخراج).',
    },
  },
  implant: {
    label: { en: 'Dental Implant', ar: 'زراعة الأسنان' },
    procedureDesc: {
      en: 'Surgical placement of a titanium implant into the jawbone, followed by a healing period and placement of a crown or bridge.',
      ar: 'تركيب زرعة من التيتانيوم جراحياً في عظم الفك، تليها فترة شفاء ثم تركيب تاج أو جسر.',
    },
    risks: {
      en: 'Infection, implant failure or rejection, nerve or sinus injury, bleeding, need for bone grafting, prolonged healing, additional cost for replacement if the implant fails.',
      ar: 'العدوى، فشل أو رفض الزرعة، إصابة العصب أو الجيوب الأنفية، النزيف، الحاجة إلى ترقيع العظم، تأخر الشفاء، تكلفة إضافية للاستبدال في حال فشل الزرعة.',
    },
    alternatives: {
      en: 'Fixed bridge, removable partial denture, no replacement.',
      ar: 'جسر ثابت، طقم أسنان جزئي متحرك، عدم الاستبدال.',
    },
  },
  general: {
    label: { en: 'Dental Procedure', ar: 'إجراء طب أسنان' },
    procedureDesc: {
      en: 'The dental procedure named on this form, performed under standard clinical protocol.',
      ar: 'إجراء طب الأسنان المذكور في هذا النموذج، يُنفذ وفق البروتوكول السريري المعتاد.',
    },
    risks: {
      en: 'Discomfort, sensitivity, swelling, and the general risks associated with dental treatment.',
      ar: 'الانزعاج، الحساسية، التورم، والمخاطر العامة المرتبطة بعلاج الأسنان.',
    },
    alternatives: {
      en: 'No treatment, or referral for a second opinion.',
      ar: 'عدم العلاج، أو الإحالة للحصول على رأي طبي ثانٍ.',
    },
  },
}

// pricing.code -> consent template class. Anything unlisted (cleaning,
// filling, whitening, the plain checkup) falls back to 'general'.
const PROCEDURE_CONSENT_CLASS = {
  'DENT-EXT': 'extraction',
  'DENT-RCT': 'rootCanal',
  'DENT-IMPLANT': 'implant',
}

export const consentClassForPriceCode = (code) => PROCEDURE_CONSENT_CLASS[code] || 'general'
