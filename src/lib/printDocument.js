import { DICT, t } from '../config/i18n'
import { computeBill } from './billing'

// ─────────────────────────────────────────────────────────────
// Printable, branded documents (invoice/receipt). Opens a new
// window with self-contained print-friendly HTML — no extra libs.
//
// LOGO: an inline SVG leaf mark is embedded so printing always works
// offline. To use the real hospital logo, replace LOGO_SVG below with
// an <img src="/logo.png"> (drop logo.png into /public) — see README.
// ─────────────────────────────────────────────────────────────

const LOGO_SVG = `
<svg width="54" height="54" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="11" fill="#184334"/>
  <path d="M29 9c0 10-6.2 17.4-15 19.6.1-1.4.5-2.8 1.1-4.1C11.6 23.3 10 19.6 10 16c5 1.3 7.6.1 10-2.4 2-2.1 5-3.8 9-4.6z" fill="#d8a73e"/>
  <path d="M14 31c2.6-6.4 7.6-11.4 13-14.2" stroke="#184334" stroke-width="1.4" fill="none" stroke-linecap="round"/>
</svg>`

const inrFmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0)

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// label helper: bilingual shows "EN / AR", ar shows arabic, en shows english
const lab = (key, lang) => (lang === 'bilingual' ? `${DICT[key].en} <span class="ar">${DICT[key].ar}</span>` : t(key, lang === 'ar' ? 'ar' : 'en'))

export function printInvoice({ bill, patient, episode, doctorName, lang = 'en' }) {
  const breakdown = computeBill({
    items: bill.items, discountType: bill.discountType, discountValue: bill.discountValue, gstRate: bill.gstRate,
  })
  const balance = breakdown.grandTotal - (bill.paidAmount || 0)
  const isRtl = lang === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'

  const title = lang === 'bilingual' ? `${DICT.invoice.en} / ${DICT.invoice.ar}` : t('invoice', isRtl ? 'ar' : 'en')
  const hospEn = DICT.hospitalName.en
  const hospAr = DICT.hospitalName.ar
  const hospName = lang === 'ar' ? hospAr : lang === 'bilingual' ? `${hospEn}<br><span class="ar">${hospAr}</span>` : hospEn

  const rows = bill.items.map((it) => {
    const amt = Number(it.qty || 1) * Number(it.rate ?? it.amount ?? 0)
    return `<tr>
      <td class="desc">${it.desc}</td>
      <td class="num">${it.qty || 1}</td>
      <td class="num">${inrFmt(it.rate ?? it.amount ?? 0)}</td>
      <td class="num">${inrFmt(amt)}</td>
    </tr>`
  }).join('')

  const discountLabel = bill.discountType === 'percent'
    ? `${lab('discount', lang)} (${bill.discountValue}%)`
    : lab('discount', lang)

  const totalsRow = (label, value, strong = false) =>
    `<tr class="${strong ? 'grand' : ''}"><td colspan="2"></td><td class="tl">${label}</td><td class="num">${value}</td></tr>`

  const patientNameDisplay = lang === 'ar' && patient.nameAr ? patient.nameAr
    : lang === 'bilingual' && patient.nameAr ? `${patient.name} / ${patient.nameAr}`
    : patient.name

  const statusText = t(bill.status === 'partial' ? 'partial' : bill.status, isRtl ? 'ar' : 'en')

  const html = `<!doctype html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${bill.invoiceNo} — ${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ${isRtl ? "'Segoe UI', Tahoma, sans-serif" : "'Segoe UI', Helvetica, Arial, sans-serif"}; color: #1d2723; margin: 0; padding: 32px; background: #fff; }
  .ar { font-family: 'Segoe UI', Tahoma, sans-serif; }
  .sheet { max-width: 760px; margin: 0 auto; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 3px solid #184334; padding-bottom: 16px; }
  .brand { display: flex; gap: 12px; align-items: center; }
  .brand .name { font-size: 16px; font-weight: 700; color: #184334; line-height: 1.3; }
  .brand .addr { font-size: 10px; color: #6b7280; margin-top: 3px; max-width: 320px; }
  .doc-title { text-align: ${isRtl ? 'left' : 'right'}; }
  .doc-title h1 { margin: 0; font-size: 22px; color: #184334; letter-spacing: 1px; }
  .doc-title .sub { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .meta { display: flex; flex-wrap: wrap; gap: 18px 40px; margin: 20px 0; }
  .meta div { font-size: 12px; }
  .meta .k { color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
  .meta .v { font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th { background: #f1f5f2; color: #184334; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; padding: 9px 10px; text-align: ${isRtl ? 'right' : 'left'}; border-bottom: 2px solid #d6ebdf; }
  thead th.num { text-align: ${isRtl ? 'left' : 'right'}; }
  tbody td { padding: 9px 10px; font-size: 12.5px; border-bottom: 1px solid #eee; }
  td.num { text-align: ${isRtl ? 'left' : 'right'}; white-space: nowrap; }
  td.desc { width: 55%; }
  .totals td { border: none; padding: 4px 10px; font-size: 12.5px; }
  .totals td.tl { text-align: ${isRtl ? 'left' : 'right'}; color: #6b7280; }
  .totals tr.grand td { font-size: 15px; font-weight: 700; color: #184334; border-top: 2px solid #184334; padding-top: 8px; }
  .pay { margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #eef7f2; color: #21664c; }
  .sign { text-align: center; font-size: 11px; color: #6b7280; }
  .sign .line { width: 180px; border-top: 1px solid #9ca3af; margin: 36px auto 4px; }
  .foot { margin-top: 28px; border-top: 1px solid #eee; padding-top: 10px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
  .note { margin-top: 8px; font-size: 9.5px; color: #b45309; font-style: italic; }
  @media print { body { padding: 0; } .sheet { max-width: 100%; } @page { margin: 16mm; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div class="brand">
      ${LOGO_SVG}
      <div>
        <div class="name">${hospName}</div>
        <div class="addr">${lang === 'ar' ? DICT.hospitalAddress.ar : DICT.hospitalAddress.en}</div>
        <div class="addr">ArogyaFlow · by Elan Iqbal</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>${title}</h1>
      <div class="sub">${bill.invoiceNo}</div>
    </div>
  </div>

  <div class="meta">
    <div><div class="k">${lab('patientName', lang)}</div><div class="v">${patientNameDisplay}</div></div>
    <div><div class="k">${lab('mrn', lang)}</div><div class="v">${patient.mrn}</div></div>
    ${episode ? `<div><div class="k">${lab('reference', lang)}</div><div class="v">${episode.refNo}</div></div>` : ''}
    <div><div class="k">${lab('date', lang)}</div><div class="v">${fmtDate(bill.date)}</div></div>
    <div><div class="k">${lab('department', lang)}</div><div class="v">${bill.department}</div></div>
    ${doctorName ? `<div><div class="k">${lab('doctor', lang)}</div><div class="v">${doctorName}</div></div>` : ''}
  </div>

  <table>
    <thead><tr>
      <th>${lab('description', lang)}</th>
      <th class="num">${lab('quantity', lang)}</th>
      <th class="num">${lab('rate', lang)}</th>
      <th class="num">${lab('amount', lang)}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    ${totalsRow(lab('subtotal', lang), inrFmt(breakdown.subtotal))}
    ${breakdown.discountAmount > 0 ? totalsRow(discountLabel, '− ' + inrFmt(breakdown.discountAmount)) : ''}
    ${breakdown.discountAmount > 0 ? totalsRow(lab('taxable', lang), inrFmt(breakdown.taxable)) : ''}
    ${breakdown.gstAmount > 0 ? totalsRow(`${lab('gst', lang)} (${bill.gstRate}%)`, inrFmt(breakdown.gstAmount)) : ''}
    ${totalsRow(lab('grandTotal', lang), inrFmt(breakdown.grandTotal), true)}
    ${totalsRow(lab('paidAmount', lang), inrFmt(bill.paidAmount || 0))}
    ${totalsRow(lab('balanceDue', lang), inrFmt(balance))}
  </table>

  <div class="pay">
    <div>
      <div class="k" style="font-size:10px;color:#9ca3af;text-transform:uppercase">${lab('paymentStatus', lang)}</div>
      <div class="badge">${statusText}</div>
      ${bill.paymentMethod ? `<div style="font-size:11px;color:#6b7280;margin-top:6px">${lab('paymentMethod', lang)}: ${bill.paymentMethod}</div>` : ''}
    </div>
    <div class="sign">
      <div class="line"></div>
      ${lab('authorizedSignature', lang)}
    </div>
  </div>

  <div class="foot">
    <span>${lang === 'ar' ? DICT.thankYou.ar : DICT.thankYou.en}</span>
    <span>${lang === 'ar' ? DICT.generatedOn.ar : DICT.generatedOn.en}: ${new Date().toLocaleString('en-IN')}</span>
  </div>
  ${(lang === 'ar' || lang === 'bilingual') ? `<div class="note">${DICT.demoNote.en}</div>` : ''}
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=860,height=1000')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
