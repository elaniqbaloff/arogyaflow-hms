// Small, dependency-free helpers used across the app.

import { VITALS_THRESHOLDS } from '../config/consultationTemplates'

export const cx = (...args) => args.filter(Boolean).join(' ')

let counter = 0
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`

export const inr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

export const today = () => new Date().toISOString().slice(0, 10)

export const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const daysFromNow = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

// Generate a sequential-looking code, e.g. MRN / invoice numbers
export const codeNo = (prefix, n) => `${prefix}-${String(n).padStart(4, '0')}`

// Calculate age in whole years from a YYYY-MM-DD date of birth.
export const calcAge = (dob) => {
  if (!dob) return ''
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 && age < 140 ? age : ''
}

// Extract the numeric tail of any MRN/UHID format, e.g.
// 'MRN-0004' -> '0004', 'AROGYA-2026-0008' -> '0008'. Used to keep
// episode reference numbers stable across old and new MRN formats.
export const mrnTail = (mrn = '') => {
  const m = String(mrn).match(/(\d+)\s*$/)
  return m ? m[1].padStart(4, '0') : '0000'
}

// Strip non-digits from a phone number for comparison.
export const normPhone = (s = '') => String(s).replace(/\D/g, '')

/**
 * Given a vitals snapshot object:
 *   { bp: '120/80', pulse, temp, rr, spo2, weight, height, bmi }
 * returns an array of human-readable abnormal-flag strings.
 * Non-blocking — purely informational for the consultation screen.
 */
export function flagAbnormalVitals(vitals) {
  if (!vitals) return []
  const flags = []
  const t = VITALS_THRESHOLDS

  if (vitals.bp && typeof vitals.bp === 'string' && vitals.bp.includes('/')) {
    const [sysStr, diaStr] = vitals.bp.split('/')
    const sys = Number(sysStr)
    const dia = Number(diaStr)
    if (!Number.isNaN(sys)) {
      if (sys >= t.bpSystolicHigh) flags.push(`High systolic BP (${sys})`)
      if (sys > 0 && sys < t.bpSystolicLow) flags.push(`Low systolic BP (${sys})`)
    }
    if (!Number.isNaN(dia)) {
      if (dia >= t.bpDiastolicHigh) flags.push(`High diastolic BP (${dia})`)
      if (dia > 0 && dia < t.bpDiastolicLow) flags.push(`Low diastolic BP (${dia})`)
    }
  }

  if (vitals.pulse != null) {
    const p = Number(vitals.pulse)
    if (!Number.isNaN(p)) {
      if (p > t.pulseHigh) flags.push(`High pulse (${p} bpm)`)
      if (p > 0 && p < t.pulseLow) flags.push(`Low pulse (${p} bpm)`)
    }
  }

  if (vitals.temp != null) {
    const temp = Number(vitals.temp)
    if (!Number.isNaN(temp) && temp >= t.tempHighC) flags.push(`Fever (${temp}°C)`)
  }

  if (vitals.spo2 != null) {
    const spo2 = Number(vitals.spo2)
    if (!Number.isNaN(spo2) && spo2 < t.spo2Low) flags.push(`Low SpO2 (${spo2}%)`)
  }

  return flags
}
