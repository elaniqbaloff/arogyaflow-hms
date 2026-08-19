import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users, Plus, Pencil, Archive, ArchiveRestore, Eye, BedDouble, Activity, FileText, Pill,
  FlaskConical, Receipt, CalendarDays, Flower2, Stethoscope, ArrowRightCircle,
  User, Phone, HeartPulse, ClipboardList, IdCard, Venus, NotebookPen, AlertTriangle, ShieldAlert,
  Gauge,
} from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { departmentOptions } from '../config/departmentUtils'
import { scopeFilter } from '../services/accessPolicy'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, Badge, Field, Input, Select, Textarea, SearchInput, EmptyState,
  Avatar, Section, Alert,
} from '../components/ui/primitives'
import {
  formatDate, inr, today, daysFromNow, uid, calcAge, mrnTail, normPhone,
} from '../lib/utils'

// ── Default patient record. Nested groups keep the (now large) record tidy and
//    make back-filling old records straightforward. Anything missing on an
//    existing patient is merged from here, so demo data keeps working. ──
const empty = {
  // Basic
  name: '', nameAr: '', gender: 'Female', dob: '', age: '',
  bloodGroup: 'O+', preferredLanguage: 'en',
  // Contact & emergency
  phone: '', altPhone: '', address: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  // Identification
  idType: 'Aadhaar', nationalId: '', abhaNumber: '',
  // Visit
  careStream: 'Ayurveda', visitType: 'OPD', patientCategory: 'New',
  department: 'Ayurveda', condition: '',
  // Clinical (top-level kept for backward compatibility)
  allergies: 'None',
  diagnosisAr: '', treatmentAr: '',
  // Medical history (grouped)
  history: {
    existingConditions: '', currentMeds: '', pastSurgeries: '', familyHistory: '',
    lifestyle: '', diet: '', sleep: '', bowel: '', addictions: '',
    pastIllnesses: '', pastHospitalizations: '',
  },
  // Pain assessment (grouped)
  pain: {
    present: 'No', score: '', location: '', duration: '', type: 'dull',
    triggers: '', relieving: '', affectsDaily: 'No',
  },
  // Female health (grouped, shown only when gender = Female)
  female: {
    cycleStatus: 'Regular', lmp: '', cycleLength: '', bleedingDuration: '',
    painfulPeriods: 'No', heavyBleeding: 'No',
    pregnancyStatus: 'Not applicable', gravida: '', liveBirths: '',
    miscarriages: '', abortions: '', deliveryHistory: 'Not applicable',
    breastfeeding: 'Not applicable', contraception: '', gynConditions: '',
    pcos: 'Unsure', thyroid: 'Unsure', menopauseSymptoms: '',
    currentComplaints: '', notes: '',
  },
}

// Merge an existing/older patient onto the defaults (deep for the grouped objects).
const withDefaults = (p = {}) => ({
  ...empty, ...p,
  history: { ...empty.history, ...(p.history || {}) },
  pain: { ...empty.pain, ...(p.pain || {}) },
  female: { ...empty.female, ...(p.female || {}) },
})

const blankPatient = () => withDefaults({ registeredOn: today() })

// Next MRN/UHID in the new AROGYA-YYYY-0001 format. Continues the existing
// numeric sequence (old MRN-0007 → AROGYA-2026-0008) so numbers stay unique.
const nextMrn = (patients) => {
  const year = new Date().getFullYear()
  const nums = patients.map((p) => parseInt(mrnTail(p.mrn), 10) || 0)
  const seq = (nums.length ? Math.max(...nums) : 0) + 1
  return `AROGYA-${year}-${String(seq).padStart(4, '0')}`
}

// Frontend duplicate detection (phone / national ID / name + DOB).
const findDuplicates = (d, patients, selfId) => {
  const phone = normPhone(d.phone)
  const altPhone = normPhone(d.altPhone)
  const nid = (d.nationalId || '').trim().toLowerCase()
  const name = (d.name || '').trim().toLowerCase()
  const hits = []
  for (const p of patients) {
    if (p.id === selfId) continue
    const reasons = []
    const pPhones = [normPhone(p.phone), normPhone(p.altPhone)].filter(Boolean)
    if (phone && pPhones.includes(phone)) reasons.push('same phone number')
    if (altPhone && pPhones.includes(altPhone)) reasons.push('matching alternate phone')
    if (nid && (p.nationalId || '').trim().toLowerCase() === nid) reasons.push('same national ID')
    if (name && (p.name || '').trim().toLowerCase() === name && d.dob && p.dob === d.dob) reasons.push('same name + date of birth')
    if (reasons.length) hits.push({ patient: p, reasons })
  }
  return hits
}

// Mandatory + conditional validation. Returns array of messages (empty = ok).
const validate = (d) => {
  const e = []
  if (!d.name.trim()) e.push('Full name is required.')
  if (!d.gender) e.push('Gender is required.')
  if (!d.dob && !String(d.age).trim()) e.push('Date of birth or age is required.')
  if (!normPhone(d.phone)) e.push('A valid phone number is required.')
  if (!d.address.trim()) e.push('Address is required.')
  if (!d.emergencyName?.trim() || !normPhone(d.emergencyPhone || '')) e.push('Emergency contact name and number are required.')
  if (!d.visitType) e.push('Visit type is required.')
  if (!d.department) e.push('Department is required.')
  if (d.pain?.present === 'Yes' && (String(d.pain.score) === '' || !d.pain.location?.trim()))
    e.push('When pain is present, both pain score and pain location are required.')
  return e
}

export default function Patients() {
  const { state, add, update, logAudit } = useHospital()
  const { activeIpdFor } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [deptFilter, setDeptFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all') // all | opd | ipd | converted | discharged
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)
  const [convertFor, setConvertFor] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const patientType = (p) => {
    const eps = state.episodes.filter((e) => e.patientId === p.id)
    const hasConverted = eps.some((e) => e.type === 'IPD' && e.convertedFrom)
    const activeIpd = eps.some((e) => e.type === 'IPD' && e.status === 'admitted')
    const dischargedIpd = eps.some((e) => e.type === 'IPD' && e.status === 'discharged')
    if (activeIpd) return hasConverted ? 'converted' : 'ipd'
    if (dischargedIpd) return 'discharged'
    return 'opd'
  }

  const filtered = useMemo(() => {
    return state.patients.filter(scopeFilter(user, state, 'patients')).filter((p) => {
      const q = query.toLowerCase()
      const matchArchived = showArchived || p.status !== 'archived'
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.nameAr || '').includes(query) || p.mrn.toLowerCase().includes(q) || (p.phone || '').includes(q)
      const matchD = deptFilter === 'all' || p.department === deptFilter
      const matchT = typeFilter === 'all' || patientType(p) === typeFilter
      return matchArchived && matchQ && matchD && matchT
    })
  }, [state, user, query, deptFilter, typeFilter, showArchived])

  const activeCount = useMemo(
    () => state.patients.filter(scopeFilter(user, state, 'patients')).filter((p) => p.status !== 'archived').length,
    [state, user]
  )

  const openAdd = () => setForm({ mode: 'add', data: blankPatient(), dupes: null })
  const openEdit = (p) => setForm({ mode: 'edit', data: withDefaults(p), dupes: null })

  const save = (force = false) => {
    const d = form.data
    const errs = validate(d)
    if (errs.length) { toast(errs[0], 'error'); return }

    const age = calcAge(d.dob) || Number(d.age) || 0

    if (form.mode === 'add') {
      const dupes = findDuplicates(d, state.patients, null)
      if (dupes.length && !force) { setForm({ ...form, dupes }); return }

      const mrn = nextMrn(state.patients)
      const patientId = uid('pat')
      add('patients', { ...d, id: patientId, mrn, age, registeredOn: today(), status: 'active' })
      // open an OPD episode automatically (refNo derived from MRN tail so it
      // works for both old MRN-#### and new AROGYA-YYYY-#### formats)
      add('episodes', {
        id: uid('ep'), patientId, mrn, type: 'OPD',
        refNo: `OPD-${mrnTail(mrn)}-01`, date: today(),
        department: d.department, doctorId: '',
        reason: d.condition || 'Registration visit', status: 'open',
      })
      toast(`Patient ${d.name} registered (${mrn}) with first OPD visit.`)
    } else {
      update('patients', d.id, { ...d, age })
      toast(`Updated ${d.name}'s record.`)
    }
    setForm(null)
  }

  // Archive instead of hard-deleting so related episodes/bills/labs/etc. are
  // never orphaned. Reversible via restore. No related records are removed.
  const archivePatient = (p) => {
    update('patients', p.id, { status: 'archived', archivedAt: new Date().toISOString(), archivedBy: user?.name || null })
    logAudit({ user, action: 'patient.archive', module: 'patients', recordId: p.id, mrn: p.mrn, severity: 'warning' })
    toast(`Archived ${p.name}. Their records are retained.`, 'info')
  }

  const restorePatient = (p) => {
    update('patients', p.id, { status: 'active', archivedAt: null, archivedBy: null })
    logAudit({ user, action: 'patient.restore', module: 'patients', recordId: p.id, mrn: p.mrn, severity: 'notice' })
    toast(`Restored ${p.name}.`)
  }

  const canCreate = can(user, 'patients.create')
  const canEdit = can(user, 'patients.update')
  const canDelete = can(user, 'patients.delete')
  const canConvert = can(user, 'patients.convert')

  const TYPE_BADGE = { opd: 'slate', ipd: 'sky', converted: 'green', discharged: 'gold' }
  const TYPE_LABEL = { opd: 'OPD', ipd: 'IPD', converted: 'OPD→IPD', discharged: 'Discharged' }

  return (
    <>
      <PageHeader
        title="Patient Management"
        subtitle={`${activeCount} active patients · one MRN spans OPD & IPD`}
        icon={Users}
        actions={canCreate && <button className="btn-primary" onClick={openAdd}><Plus size={18} /> New Patient</button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, Arabic name, MRN, phone…" />
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
              <option value="all">All patients</option>
              <option value="opd">OPD only</option>
              <option value="ipd">Active IPD</option>
              <option value="converted">OPD→IPD</option>
              <option value="discharged">Discharged</option>
            </Select>
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-auto">
              <option value="all">All departments</option>
              {departmentOptions(state).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </Select>
            <Select value={showArchived ? 'yes' : 'no'} onChange={(e) => setShowArchived(e.target.value === 'yes')} className="w-auto">
              <option value="no">Active only</option>
              <option value="yes">Include archived</option>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No patients found" message="Try a different search, or register a new patient."
            action={canCreate && <button className="btn-primary" onClick={openAdd}><Plus size={16} /> New Patient</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Patient</th><th className="th">MRN / UHID</th><th className="th">Type</th><th className="th">Age / Gender</th>
                <th className="th">Department</th><th className="th">Lang</th><th className="th text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {filtered.map((p) => {
                  const type = patientType(p)
                  const flagAllergy = p.allergies && !/^(none|nil|na|n\/a)$/i.test(p.allergies.trim())
                  return (
                    <tr key={p.id} className="hover:bg-cream/40">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div>
                            <p className="font-medium text-brand-900 flex items-center gap-1.5">
                              {p.name}
                              {flagAllergy && <span title={`Allergy: ${p.allergies}`}><AlertTriangle size={13} className="text-rose-500" /></span>}
                              {p.status === 'archived' && <Badge tone="slate">Archived</Badge>}
                            </p>
                            {p.nameAr && <p className="text-xs text-ink/40" dir="rtl">{p.nameAr}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="td font-mono text-xs text-ink/60">{p.mrn}</td>
                      <td className="td"><Badge tone={TYPE_BADGE[type]}>{TYPE_LABEL[type]}</Badge></td>
                      <td className="td">{p.age} · {p.gender}</td>
                      <td className="td">{p.department}</td>
                      <td className="td uppercase text-xs text-ink/50">{p.preferredLanguage === 'bilingual' ? 'EN/AR' : p.preferredLanguage}</td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-ghost btn-sm" onClick={() => setDetail(p)} title="View"><Eye size={15} /></button>
                          {p.status === 'archived'
                            ? (canDelete && <button className="btn-ghost btn-sm text-brand-700" onClick={() => restorePatient(p)} title="Restore"><ArchiveRestore size={15} /></button>)
                            : (
                              <>
                                {canConvert && !activeIpdFor(p.id) && (
                                  <button className="btn-ghost btn-sm text-brand-700" onClick={() => setConvertFor(p)} title="Convert to IPD"><BedDouble size={15} /></button>
                                )}
                                {canEdit && <button className="btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit"><Pencil size={15} /></button>}
                                {canDelete && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm(p)} title="Archive"><Archive size={15} /></button>}
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <PatientForm form={form} setForm={setForm} onSave={save} departments={departmentOptions(state)} />}
      {detail && <PatientDetail patient={detail} onClose={() => setDetail(null)} onConvert={canConvert ? (p) => { setDetail(null); setConvertFor(p) } : null} />}
      {convertFor && <ConvertModal patient={convertFor} onClose={() => setConvertFor(null)} />}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => archivePatient(confirm)}
        title="Archive patient?"
        confirmLabel="Archive"
        message={confirm ? `This will archive ${confirm.name} (${confirm.mrn}) and hide them from the active list. Their episodes, bills, lab and clinical records are kept, and you can restore them later.` : ''}
      />
    </>
  )
}

const GENDERS = ['Female', 'Male', 'Other']
const BLOOD = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown']
const ID_TYPES = ['Aadhaar', 'Emirates ID', 'Passport', 'PAN', 'Other']
const CARE_STREAMS = ['Ayurveda', 'Allopathy', 'Both']
const VISIT_TYPES = ['OPD', 'IPD', 'Emergency', 'Follow-up']
const CATEGORIES = ['New', 'Returning']
const PAIN_TYPES = ['sharp', 'dull', 'burning', 'throbbing', 'cramping', 'radiating', 'other']
const CYCLE_STATUS = ['Regular', 'Irregular', 'Menopause', 'Not applicable']
const PREGNANCY = ['Not applicable', 'Not pregnant', 'Pregnant', 'Unsure']
const DELIVERY = ['Not applicable', 'Normal delivery', 'C-section', 'Both']
const YESNO = ['No', 'Yes']
const YESNO_NA = ['Not applicable', 'No', 'Yes']
const TRISTATE = ['Unsure', 'No', 'Yes']

function PatientForm({ form, setForm, onSave, departments }) {
  const d = form.data
  const set = (k, v) => setForm({ ...form, data: { ...d, [k]: v }, dupes: null })
  const setIn = (group, k, v) => setForm({ ...form, data: { ...d, [group]: { ...d[group], [k]: v } }, dupes: null })

  const isAr = d.preferredLanguage === 'ar' || d.preferredLanguage === 'bilingual'
  const isFemale = d.gender === 'Female'
  const autoAge = calcAge(d.dob)
  const pregnant = isFemale && d.female.pregnancyStatus === 'Pregnant'
  const painYes = d.pain.present === 'Yes'

  return (
    <Modal open onClose={() => setForm(null)} title={form.mode === 'add' ? 'Register New Patient' : 'Edit Patient'}
      subtitle="One master record · OPD & IPD share this MRN · grouped clinical intake" size="lg"
      footer={<>
        <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
        {form.dupes?.length
          ? <button className="btn-gold" onClick={() => onSave(true)}>Save anyway</button>
          : <button className="btn-primary" onClick={() => onSave(false)}>Save Patient</button>}
      </>}>

      {form.dupes?.length > 0 && (
        <div className="mb-4">
          <Alert tone="rose" icon={ShieldAlert} title="Possible duplicate patient">
            A patient with matching details already exists. Please confirm this is a different person before continuing.
            <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
              {form.dupes.slice(0, 4).map((h) => (
                <li key={h.patient.id}>
                  <span className="font-medium">{h.patient.name}</span> ({h.patient.mrn}) — {h.reasons.join(', ')}
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* ── Basic details ── */}
        <Section title="Basic Details" icon={User}>
          <Field label="Full name (English)" required><Input value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Name (Arabic)" hint="For Arabic/bilingual documents"><Input dir="rtl" value={d.nameAr} onChange={(e) => set('nameAr', e.target.value)} placeholder="الاسم بالعربية" /></Field>
          <Field label="Gender" required><Select value={d.gender} onChange={(e) => set('gender', e.target.value)}>{GENDERS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
          <Field label="Date of birth" hint={autoAge !== '' ? `Age auto-calculated: ${autoAge} yrs` : 'Sets age automatically'}>
            <Input type="date" value={d.dob} max={today()} onChange={(e) => set('dob', e.target.value)} />
          </Field>
          <Field label="Age" required={!d.dob} hint={d.dob ? 'From date of birth' : 'Use if DOB unknown'}>
            <Input type="number" min="0" value={d.dob ? autoAge : d.age} readOnly={!!d.dob}
              className={d.dob ? 'bg-cream/60 text-ink/60' : ''}
              onChange={(e) => set('age', e.target.value)} />
          </Field>
          <Field label="Blood group"><Select value={d.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>{BLOOD.map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Preferred language">
            <Select value={d.preferredLanguage} onChange={(e) => set('preferredLanguage', e.target.value)}>
              <option value="en">English</option><option value="ar">Arabic</option><option value="bilingual">Bilingual (EN + AR)</option>
            </Select>
          </Field>
        </Section>

        {/* ── Contact & emergency ── */}
        <Section title="Contact & Emergency Details" icon={Phone}>
          <Field label="Mobile number" required><Input value={d.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Alternate phone"><Input value={d.altPhone} onChange={(e) => set('altPhone', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Address" required><Input value={d.address} onChange={(e) => set('address', e.target.value)} /></Field></div>
          <Field label="Emergency contact name" required><Input value={d.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} /></Field>
          <Field label="Emergency contact number" required><Input value={d.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} /></Field>
          <Field label="Relationship" hint="e.g. spouse, parent, son"><Input value={d.emergencyRelation} onChange={(e) => set('emergencyRelation', e.target.value)} /></Field>
        </Section>

        {/* ── Identification ── */}
        <Section title="Identification" icon={IdCard} desc="optional but recommended">
          <Field label="ID type"><Select value={d.idType} onChange={(e) => set('idType', e.target.value)}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="National ID / Aadhaar / Emirates ID / Passport"><Input value={d.nationalId} onChange={(e) => set('nationalId', e.target.value)} /></Field>
          <Field label="ABHA number" hint="Ayushman Bharat Health Account — optional"><Input value={d.abhaNumber} onChange={(e) => set('abhaNumber', e.target.value)} /></Field>
        </Section>

        {/* ── Visit details ── */}
        <Section title="Visit Details" icon={ClipboardList}>
          <Field label="Preferred care stream"><Select value={d.careStream} onChange={(e) => set('careStream', e.target.value)}>{CARE_STREAMS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Department" required><Select value={d.department} onChange={(e) => set('department', e.target.value)}>{departments.map((x) => <option key={x.id}>{x.name}</option>)}</Select></Field>
          <Field label="Visit type" required><Select value={d.visitType} onChange={(e) => set('visitType', e.target.value)}>{VISIT_TYPES.map((v) => <option key={v}>{v}</option>)}</Select></Field>
          <Field label="Patient category"><Select value={d.patientCategory} onChange={(e) => set('patientCategory', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Field label="Presenting condition / reason for visit"><Input value={d.condition} onChange={(e) => set('condition', e.target.value)} /></Field></div>
        </Section>

        {/* ── Medical history ── */}
        <Section title="Medical History" icon={HeartPulse}>
          <Field label="Allergies" hint="Drug / food / other — write 'None' if nil"><Input value={d.allergies} onChange={(e) => set('allergies', e.target.value)} /></Field>
          <Field label="Existing medical conditions" hint="e.g. diabetes, hypertension"><Input value={d.history.existingConditions} onChange={(e) => setIn('history', 'existingConditions', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Current medications"><Textarea value={d.history.currentMeds} onChange={(e) => setIn('history', 'currentMeds', e.target.value)} placeholder="Name, dose, frequency" /></Field></div>
          <Field label="Past surgeries / procedures"><Input value={d.history.pastSurgeries} onChange={(e) => setIn('history', 'pastSurgeries', e.target.value)} /></Field>
          <Field label="Family history"><Input value={d.history.familyHistory} onChange={(e) => setIn('history', 'familyHistory', e.target.value)} /></Field>
          <Field label="Previous major illnesses"><Input value={d.history.pastIllnesses} onChange={(e) => setIn('history', 'pastIllnesses', e.target.value)} /></Field>
          <Field label="Previous hospitalizations"><Input value={d.history.pastHospitalizations} onChange={(e) => setIn('history', 'pastHospitalizations', e.target.value)} /></Field>
          <Field label="Diet habits" hint="e.g. vegetarian, mixed"><Input value={d.history.diet} onChange={(e) => setIn('history', 'diet', e.target.value)} /></Field>
          <Field label="Sleep pattern"><Input value={d.history.sleep} onChange={(e) => setIn('history', 'sleep', e.target.value)} /></Field>
          <Field label="Bowel habits"><Input value={d.history.bowel} onChange={(e) => setIn('history', 'bowel', e.target.value)} /></Field>
          <Field label="Addiction history" hint="tobacco / alcohol / other — optional"><Input value={d.history.addictions} onChange={(e) => setIn('history', 'addictions', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Lifestyle notes"><Textarea value={d.history.lifestyle} onChange={(e) => setIn('history', 'lifestyle', e.target.value)} placeholder="Occupation, activity level, stress, etc." /></Field></div>
        </Section>

        {/* ── Pain assessment ── */}
        <Section title="Pain Assessment" icon={Gauge} desc="captured at first visit" tone="gold">
          <Field label="Pain present?"><Select value={d.pain.present} onChange={(e) => setIn('pain', 'present', e.target.value)}>{YESNO.map((v) => <option key={v}>{v}</option>)}</Select></Field>
          {painYes && (
            <>
              <Field label="Pain score (0–10)" required hint="0 = none · 10 = worst imaginable">
                <Select value={d.pain.score} onChange={(e) => setIn('pain', 'score', e.target.value)}>
                  <option value="">— select —</option>
                  {Array.from({ length: 11 }, (_, i) => <option key={i} value={String(i)}>{i}</option>)}
                </Select>
              </Field>
              <Field label="Pain location" required><Input value={d.pain.location} onChange={(e) => setIn('pain', 'location', e.target.value)} /></Field>
              <Field label="Pain duration" hint="e.g. 3 days, 2 weeks"><Input value={d.pain.duration} onChange={(e) => setIn('pain', 'duration', e.target.value)} /></Field>
              <Field label="Pain type"><Select value={d.pain.type} onChange={(e) => setIn('pain', 'type', e.target.value)}>{PAIN_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Triggers / aggravating factors"><Input value={d.pain.triggers} onChange={(e) => setIn('pain', 'triggers', e.target.value)} /></Field>
              <Field label="Relieving factors"><Input value={d.pain.relieving} onChange={(e) => setIn('pain', 'relieving', e.target.value)} /></Field>
              <Field label="Affects sleep / daily activity?"><Select value={d.pain.affectsDaily} onChange={(e) => setIn('pain', 'affectsDaily', e.target.value)}>{YESNO.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            </>
          )}
        </Section>

        {/* ── Female health (only when gender = Female) ── */}
        {isFemale && (
          <Section title="Female Health Details" icon={Venus} desc="optional · clinically relevant" tone="rose">
            <div className="sm:col-span-2">
              <Alert tone="sky">
                This section is optional and intended only for clinically relevant care. Complete what is applicable; leave the rest blank.
              </Alert>
            </div>
            {pregnant && (
              <div className="sm:col-span-2">
                <Alert tone="rose" icon={ShieldAlert} title="Pregnancy safety alert">
                  Patient is marked <span className="font-medium">Pregnant</span>. Review all medications, imaging and therapies for pregnancy safety before prescribing.
                </Alert>
              </div>
            )}
            <Field label="Menstrual cycle status"><Select value={d.female.cycleStatus} onChange={(e) => setIn('female', 'cycleStatus', e.target.value)}>{CYCLE_STATUS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Last menstrual period (LMP)" hint="Shown in doctor summary"><Input type="date" value={d.female.lmp} max={today()} onChange={(e) => setIn('female', 'lmp', e.target.value)} /></Field>
            <Field label="Average cycle length (days)"><Input type="number" min="0" value={d.female.cycleLength} onChange={(e) => setIn('female', 'cycleLength', e.target.value)} /></Field>
            <Field label="Duration of bleeding (days)"><Input type="number" min="0" value={d.female.bleedingDuration} onChange={(e) => setIn('female', 'bleedingDuration', e.target.value)} /></Field>
            <Field label="Painful periods?"><Select value={d.female.painfulPeriods} onChange={(e) => setIn('female', 'painfulPeriods', e.target.value)}>{YESNO.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Heavy bleeding?"><Select value={d.female.heavyBleeding} onChange={(e) => setIn('female', 'heavyBleeding', e.target.value)}>{YESNO.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Pregnancy status"><Select value={d.female.pregnancyStatus} onChange={(e) => setIn('female', 'pregnancyStatus', e.target.value)}>{PREGNANCY.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Number of pregnancies"><Input type="number" min="0" value={d.female.gravida} onChange={(e) => setIn('female', 'gravida', e.target.value)} /></Field>
            <Field label="Live births"><Input type="number" min="0" value={d.female.liveBirths} onChange={(e) => setIn('female', 'liveBirths', e.target.value)} /></Field>
            <Field label="Miscarriages"><Input type="number" min="0" value={d.female.miscarriages} onChange={(e) => setIn('female', 'miscarriages', e.target.value)} /></Field>
            <Field label="Abortions / terminations"><Input type="number" min="0" value={d.female.abortions} onChange={(e) => setIn('female', 'abortions', e.target.value)} /></Field>
            <Field label="Delivery history"><Select value={d.female.deliveryHistory} onChange={(e) => setIn('female', 'deliveryHistory', e.target.value)}>{DELIVERY.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Currently breastfeeding?"><Select value={d.female.breastfeeding} onChange={(e) => setIn('female', 'breastfeeding', e.target.value)}>{YESNO_NA.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Contraception use"><Input value={d.female.contraception} onChange={(e) => setIn('female', 'contraception', e.target.value)} /></Field>
            <Field label="PCOS / PCOD history"><Select value={d.female.pcos} onChange={(e) => setIn('female', 'pcos', e.target.value)}>{TRISTATE.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Thyroid history"><Select value={d.female.thyroid} onChange={(e) => setIn('female', 'thyroid', e.target.value)}>{TRISTATE.map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Gynaecological conditions"><Input value={d.female.gynConditions} onChange={(e) => setIn('female', 'gynConditions', e.target.value)} /></Field>
            <Field label="Menopause symptoms" hint="if applicable"><Input value={d.female.menopauseSymptoms} onChange={(e) => setIn('female', 'menopauseSymptoms', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Current gynaecology-related complaints"><Textarea value={d.female.currentComplaints} onChange={(e) => setIn('female', 'currentComplaints', e.target.value)} /></Field></div>
            <div className="sm:col-span-2"><Field label="Notes for doctor"><Textarea value={d.female.notes} onChange={(e) => setIn('female', 'notes', e.target.value)} /></Field></div>
          </Section>
        )}

        {/* ── Arabic patient-facing fields ── */}
        {isAr && (
          <Section title="Arabic Patient Documents" icon={FileText} desc="demo helper translation" tone="gold">
            <div className="sm:col-span-2"><Field label="Diagnosis explanation (Arabic)" hint="Patient-facing — demo helper translation"><Textarea dir="rtl" value={d.diagnosisAr} onChange={(e) => set('diagnosisAr', e.target.value)} placeholder="شرح التشخيص بالعربية" /></Field></div>
            <div className="sm:col-span-2"><Field label="Treatment instructions (Arabic)"><Textarea dir="rtl" value={d.treatmentAr} onChange={(e) => set('treatmentAr', e.target.value)} placeholder="تعليمات العلاج بالعربية" /></Field></div>
          </Section>
        )}
      </div>
    </Modal>
  )
}

function ConvertModal({ patient, onClose }) {
  const { state, convertToIpd } = useHospital()
  const toast = useToast()
  const openOpd = state.episodes.filter((e) => e.patientId === patient.id && e.type === 'OPD')
  const availableBeds = state.beds.filter((b) => b.status === 'available')
  const [data, setData] = useState({
    opdEpisodeId: openOpd[0]?.id || '',
    bedId: availableBeds[0]?.id || '',
    doctorId: state.doctors[0]?.id || '',
    nurseId: state.nurses[0]?.id || '',
    admitDate: today(), expectedDischarge: daysFromNow(5),
    diagnosis: patient.condition || '', reason: '', advance: 0,
  })

  const save = () => {
    if (!data.bedId) { toast('Select an available bed.', 'error'); return }
    const bed = state.beds.find((b) => b.id === data.bedId)
    const seq = state.episodes.filter((e) => e.patientId === patient.id && e.type === 'IPD').length + 1
    const tail = mrnTail(patient.mrn)
    convertToIpd({
      id: uid('ep'), patientId: patient.id, mrn: patient.mrn,
      refNo: `IPD-${tail}-${String(seq).padStart(2, '0')}`,
      date: data.admitDate, department: bed.ward, doctorId: data.doctorId, nurseId: data.nurseId,
      ward: bed.ward, admitDate: data.admitDate, expectedDischarge: data.expectedDischarge,
      diagnosis: data.diagnosis, reason: data.reason, advance: Number(data.advance) || 0,
    }, data.opdEpisodeId || null, data.bedId)
    toast(`${patient.name} converted to IPD — same MRN ${patient.mrn} retained.`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Convert OPD → IPD" subtitle={`${patient.name} · ${patient.mrn} (no duplicate record created)`}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Admit as IPD</button></>}>
      {availableBeds.length === 0 ? (
        <p className="text-sm text-rose-600">No available beds. Free a bed first from IPD & Beds.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Link OPD visit">
            <Select value={data.opdEpisodeId} onChange={(e) => setData({ ...data, opdEpisodeId: e.target.value })}>
              <option value="">— none —</option>
              {openOpd.map((e) => <option key={e.id} value={e.id}>{e.refNo} · {formatDate(e.date)}</option>)}
            </Select>
          </Field>
          <Field label="Bed" required>
            <Select value={data.bedId} onChange={(e) => setData({ ...data, bedId: e.target.value })}>
              {availableBeds.map((b) => <option key={b.id} value={b.id}>{b.ward} · {b.bedNo} ({b.room})</option>)}
            </Select>
          </Field>
          <Field label="Admitting doctor"><Select value={data.doctorId} onChange={(e) => setData({ ...data, doctorId: e.target.value })}>{state.doctors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
          <Field label="Assigned nurse"><Select value={data.nurseId} onChange={(e) => setData({ ...data, nurseId: e.target.value })}>{state.nurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</Select></Field>
          <Field label="Admission date"><Input type="date" value={data.admitDate} onChange={(e) => setData({ ...data, admitDate: e.target.value })} /></Field>
          <Field label="Expected discharge"><Input type="date" value={data.expectedDischarge} onChange={(e) => setData({ ...data, expectedDischarge: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Initial diagnosis"><Input value={data.diagnosis} onChange={(e) => setData({ ...data, diagnosis: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Reason for admission"><Textarea value={data.reason} onChange={(e) => setData({ ...data, reason: e.target.value })} /></Field></div>
          <Field label="Advance payment (₹)"><Input type="number" value={data.advance} onChange={(e) => setData({ ...data, advance: e.target.value })} /></Field>
        </div>
      )}
    </Modal>
  )
}

// Small presentational helpers for the detail view.
const Row = ({ label, value, rtl }) => (
  <div><p className="text-[11px] uppercase tracking-wide text-ink/40">{label}</p><p className="mt-0.5 text-sm text-ink/80" dir={rtl ? 'rtl' : 'ltr'}>{value || '—'}</p></div>
)
const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== '' && !/^(not applicable|unsure)$/i.test(String(v).trim())

function DetailSection({ title, icon: Icon, children, tone = 'brand' }) {
  const tones = { brand: 'text-brand-700', gold: 'text-gold-600', rose: 'text-rose-600', sky: 'text-sky-600' }
  return (
    <div className="rounded-xl border border-sand p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={15} className={tones[tone]} />}
        <h4 className="text-sm font-semibold text-brand-900">{title}</h4>
      </div>
      {children}
    </div>
  )
}

function PatientDetail({ patient: raw, onClose, onConvert }) {
  const { state } = useHospital()
  const { doctorName } = useLookups()
  const [tab, setTab] = useState('overview')
  const patient = withDefaults(raw)

  const eps = state.episodes.filter((e) => e.patientId === patient.id)
  const appts = state.appointments.filter((a) => a.patientId === patient.id)
  const cons = state.consultations.filter((c) => c.patientId === patient.id)
  const rxs = state.prescriptions.filter((r) => r.patientId === patient.id)
  const labs = state.labTests.filter((l) => l.patientId === patient.id)
  const therapies = state.therapies.filter((t) => t.patientId === patient.id)
  const vitals = state.vitals.filter((v) => v.patientId === patient.id)
  const bills = state.bills.filter((b) => b.patientId === patient.id)
  const activeIpd = eps.find((e) => e.type === 'IPD' && e.status === 'admitted')

  const isFemale = patient.gender === 'Female'
  const pregnant = isFemale && patient.female.pregnancyStatus === 'Pregnant'
  const flagAllergy = patient.allergies && !/^(none|nil|na|n\/a)$/i.test(patient.allergies.trim())
  const h = patient.history
  const f = patient.female
  const pn = patient.pain

  // Build a chronological timeline
  const timeline = useMemo(() => {
    const ev = []
    ev.push({ date: patient.registeredOn, icon: Users, title: 'Registration created', detail: patient.mrn, tone: 'slate' })
    if (pn.present === 'Yes') ev.push({ date: patient.registeredOn, icon: Gauge, title: 'Pain score recorded', detail: `Score ${pn.score || '—'}/10 · ${pn.location || 'unspecified'}`, tone: 'gold' })
    if (hasVal(h.existingConditions) || hasVal(h.currentMeds) || hasVal(h.familyHistory)) ev.push({ date: patient.registeredOn, icon: ClipboardList, title: 'Initial assessment recorded', detail: 'Medical history captured at registration', tone: 'green' })
    eps.forEach((e) => {
      if (e.type === 'OPD') ev.push({ date: e.date, icon: CalendarDays, title: `OPD visit · ${e.refNo}`, detail: e.reason, tone: 'slate' })
      else {
        ev.push({ date: e.admitDate, icon: BedDouble, title: `${e.convertedFrom ? 'Converted to IPD' : 'IPD admission'} · ${e.refNo}`, detail: `${e.ward} — ${e.diagnosis || e.reason}`, tone: 'sky' })
        ;(e.transfers || []).forEach((t) => ev.push({ date: t.date, icon: BedDouble, title: 'Bed transfer', detail: `${t.from} → ${t.to} (${t.reason})`, tone: 'gold' }))
        if (e.dischargeDate) ev.push({ date: e.dischargeDate, icon: ArrowRightCircle, title: `Discharged · ${e.refNo}`, detail: e.ward, tone: 'green' })
      }
    })
    appts.forEach((a) => ev.push({ date: a.date, icon: CalendarDays, title: `Appointment — ${a.status}`, detail: `${a.reason} · ${doctorName(a.doctorId)}`, tone: 'slate' }))
    cons.forEach((c) => ev.push({ date: c.date, icon: Stethoscope, title: 'Consultation completed', detail: c.diagnosis || c.notes, tone: 'green' }))
    rxs.forEach((r) => ev.push({ date: r.createdOn, icon: Pill, title: `Prescription added — ${r.status}`, detail: r.items.map((i) => i.name).join(', '), tone: 'gold' }))
    labs.forEach((l) => ev.push({ date: l.requestedOn, icon: FlaskConical, title: `Lab — ${l.testName} (${l.status})`, detail: l.result || 'Requested', tone: 'sky' }))
    therapies.forEach((t) => ev.push({ date: t.date, icon: Flower2, title: `Therapy — ${t.type} (${t.status})`, detail: t.notes, tone: 'green' }))
    vitals.forEach((v) => ev.push({ date: v.recordedAt, icon: Activity, title: 'Vitals recorded', detail: `BP ${v.bp} · Pulse ${v.pulse} · SpO₂ ${v.spo2}%`, tone: 'slate' }))
    bills.forEach((b) => ev.push({ date: b.date, icon: Receipt, title: `Bill generated — ${b.invoiceNo} (${b.status})`, detail: `${b.billType} · ${inr(b.total)}`, tone: 'gold' }))
    return ev.filter((e) => e.date).sort((a, b) => b.date.localeCompare(a.date))
  }, [patient, eps, appts, cons, rxs, labs, therapies, vitals, bills, doctorName])

  const TABS = [
    ['overview', 'Overview'],
    ['medical', 'Medical'],
    ['clinical', `Clinical (${cons.length + rxs.length + labs.length})`],
    ['episodes', `Visits (${eps.length})`],
    ['timeline', `Timeline (${timeline.length})`],
    ['billing', `Billing (${bills.length})`],
  ]

  return (
    <Modal open onClose={onClose} title={patient.name} subtitle={`${patient.mrn} · ${patient.visitType || 'OPD'} · Registered ${formatDate(patient.registeredOn)}`} size="lg"
      footer={onConvert && !activeIpd ? <button className="btn-primary" onClick={() => onConvert(patient)}><BedDouble size={16} /> Convert to IPD</button> : (activeIpd ? <Badge status="active">Active IPD · {activeIpd.ward}</Badge> : null)}>

      {/* Safety banners always visible at the top */}
      {(flagAllergy || pregnant || hasVal(f.lmp)) && (
        <div className="mb-4 space-y-2">
          {flagAllergy && <Alert tone="rose" icon={AlertTriangle} title="Allergy on record">{patient.allergies}</Alert>}
          {pregnant && <Alert tone="rose" icon={ShieldAlert} title="Pregnant — review medication & therapy safety" />}
          {hasVal(f.lmp) && <Alert tone="sky" icon={Venus} title={`LMP: ${formatDate(f.lmp)}`}>Shown for doctor review.</Alert>}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-sand/60 p-1 w-fit">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-xl bg-cream/60 p-4">
            <Avatar name={patient.name} size={52} />
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <Row label="Age / Gender" value={`${patient.age} · ${patient.gender}`} />
              <Row label="Blood group" value={patient.bloodGroup} />
              <Row label="Date of birth" value={patient.dob ? formatDate(patient.dob) : '—'} />
              <Row label="Language" value={patient.preferredLanguage === 'bilingual' ? 'Bilingual' : patient.preferredLanguage === 'ar' ? 'Arabic' : 'English'} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailSection title="Contact" icon={Phone}>
              <div className="grid grid-cols-2 gap-3">
                <Row label="Mobile" value={patient.phone} />
                <Row label="Alternate" value={patient.altPhone} />
                <div className="col-span-2"><Row label="Address" value={patient.address} /></div>
                {patient.nameAr && <div className="col-span-2"><Row label="Arabic name" value={patient.nameAr} rtl /></div>}
              </div>
            </DetailSection>

            <DetailSection title="Emergency Contact" icon={ShieldAlert} tone="rose">
              <div className="grid grid-cols-2 gap-3">
                <Row label="Name" value={patient.emergencyName} />
                <Row label="Relationship" value={patient.emergencyRelation} />
                <Row label="Number" value={patient.emergencyPhone} />
              </div>
            </DetailSection>

            <DetailSection title="Identification" icon={IdCard}>
              <div className="grid grid-cols-2 gap-3">
                <Row label={patient.idType || 'National ID'} value={patient.nationalId} />
                <Row label="ABHA number" value={patient.abhaNumber} />
              </div>
            </DetailSection>

            <DetailSection title="Visit" icon={ClipboardList}>
              <div className="grid grid-cols-2 gap-3">
                <Row label="Care stream" value={patient.careStream} />
                <Row label="Department" value={patient.department} />
                <Row label="Visit type" value={patient.visitType} />
                <Row label="Category" value={patient.patientCategory} />
                <div className="col-span-2"><Row label="Presenting condition" value={patient.condition} /></div>
              </div>
            </DetailSection>
          </div>
        </div>
      )}

      {tab === 'medical' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailSection title="Allergies & Conditions" icon={AlertTriangle} tone="rose">
            <div className="grid grid-cols-1 gap-3">
              <Row label="Allergies" value={patient.allergies} />
              <Row label="Existing conditions" value={h.existingConditions} />
              <Row label="Current medications" value={h.currentMeds} />
            </div>
          </DetailSection>

          <DetailSection title="History" icon={HeartPulse}>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Past surgeries" value={h.pastSurgeries} />
              <Row label="Family history" value={h.familyHistory} />
              <Row label="Major illnesses" value={h.pastIllnesses} />
              <Row label="Hospitalizations" value={h.pastHospitalizations} />
            </div>
          </DetailSection>

          <DetailSection title="Lifestyle" icon={NotebookPen}>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Diet" value={h.diet} />
              <Row label="Sleep" value={h.sleep} />
              <Row label="Bowel" value={h.bowel} />
              <Row label="Addictions" value={h.addictions} />
              <div className="col-span-2"><Row label="Lifestyle notes" value={h.lifestyle} /></div>
            </div>
          </DetailSection>

          <DetailSection title="Pain Assessment" icon={Gauge} tone="gold">
            {pn.present === 'Yes' ? (
              <div className="grid grid-cols-2 gap-3">
                <Row label="Score" value={`${pn.score || '—'} / 10`} />
                <Row label="Location" value={pn.location} />
                <Row label="Type" value={pn.type} />
                <Row label="Duration" value={pn.duration} />
                <Row label="Triggers" value={pn.triggers} />
                <Row label="Relieved by" value={pn.relieving} />
                <Row label="Affects daily life" value={pn.affectsDaily} />
              </div>
            ) : <p className="text-sm text-ink/50">No pain reported at registration.</p>}
          </DetailSection>

          {isFemale && (
            <div className="sm:col-span-2">
              <DetailSection title="Female Health" icon={Venus} tone="rose">
                {pregnant && <div className="mb-3"><Alert tone="rose" icon={ShieldAlert} title="Pregnant — review medication & therapy safety" /></div>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Row label="Cycle status" value={f.cycleStatus} />
                  <Row label="LMP" value={f.lmp ? formatDate(f.lmp) : '—'} />
                  <Row label="Cycle length" value={f.cycleLength && `${f.cycleLength} days`} />
                  <Row label="Bleeding duration" value={f.bleedingDuration && `${f.bleedingDuration} days`} />
                  <Row label="Painful periods" value={f.painfulPeriods} />
                  <Row label="Heavy bleeding" value={f.heavyBleeding} />
                  <Row label="Pregnancy status" value={f.pregnancyStatus} />
                  <Row label="Pregnancies" value={f.gravida} />
                  <Row label="Live births" value={f.liveBirths} />
                  <Row label="Miscarriages" value={f.miscarriages} />
                  <Row label="Terminations" value={f.abortions} />
                  <Row label="Delivery history" value={f.deliveryHistory} />
                  <Row label="Breastfeeding" value={f.breastfeeding} />
                  <Row label="Contraception" value={f.contraception} />
                  <Row label="PCOS / PCOD" value={f.pcos} />
                  <Row label="Thyroid" value={f.thyroid} />
                  <Row label="Gyn. conditions" value={f.gynConditions} />
                  <Row label="Menopause symptoms" value={f.menopauseSymptoms} />
                </div>
                {(hasVal(f.currentComplaints) || hasVal(f.notes)) && (
                  <div className="mt-3 grid grid-cols-1 gap-3 border-t border-sand pt-3">
                    <Row label="Current complaints" value={f.currentComplaints} />
                    <Row label="Notes for doctor" value={f.notes} />
                  </div>
                )}
              </DetailSection>
            </div>
          )}
        </div>
      )}

      {tab === 'clinical' && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-900"><Stethoscope size={15} className="text-brand-700" /> Consultations</p>
            {cons.length === 0 ? <p className="text-sm text-ink/40 pl-1">None yet.</p> : (
              <ul className="divide-y divide-sand">
                {cons.map((c) => (
                  <li key={c.id} className="py-2.5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-brand-900">{c.diagnosis || 'Consultation'}</p><span className="text-xs text-ink/40">{formatDate(c.date)}</span></div>{c.notes && <p className="text-sm text-ink/55">{c.notes}</p>}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-900"><Pill size={15} className="text-gold-600" /> Prescriptions</p>
            {rxs.length === 0 ? <p className="text-sm text-ink/40 pl-1">None yet.</p> : (
              <ul className="divide-y divide-sand">
                {rxs.map((r) => (
                  <li key={r.id} className="py-2.5"><div className="flex items-center justify-between"><p className="text-sm text-ink/80">{r.items.map((i) => i.name).join(', ')}</p><Badge status={r.status} /></div><span className="text-xs text-ink/40">{formatDate(r.createdOn)}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-900"><FlaskConical size={15} className="text-sky-600" /> Lab requests / results</p>
            {labs.length === 0 ? <p className="text-sm text-ink/40 pl-1">None yet.</p> : (
              <ul className="divide-y divide-sand">
                {labs.map((l) => (
                  <li key={l.id} className="py-2.5"><div className="flex items-center justify-between"><p className="text-sm text-ink/80">{l.testName}</p><Badge status={l.status} /></div>{l.result && <p className="text-sm text-ink/55">Result: {l.result}</p>}<span className="text-xs text-ink/40">{formatDate(l.requestedOn)}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-900"><CalendarDays size={15} className="text-slate-500" /> Appointments</p>
            {appts.length === 0 ? <p className="text-sm text-ink/40 pl-1">None yet.</p> : (
              <ul className="divide-y divide-sand">
                {appts.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-center justify-between"><div><p className="text-sm text-ink/80">{a.reason}</p><span className="text-xs text-ink/40">{formatDate(a.date)} · {doctorName(a.doctorId)}</span></div><Badge status={a.status} /></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'episodes' && (
        <ul className="divide-y divide-sand">
          {eps.length === 0 && <EmptyState title="No visits yet" />}
          {eps.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((e) => (
            <li key={e.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-brand-900">{e.refNo} <Badge tone={e.type === 'IPD' ? 'sky' : 'slate'}>{e.type}</Badge></p>
                <p className="text-sm text-ink/60">{e.type === 'IPD' ? `${e.ward} — ${e.diagnosis || e.reason}` : e.reason} · {formatDate(e.date || e.admitDate)}</p>
              </div>
              <Badge status={e.status} />
            </li>
          ))}
        </ul>
      )}

      {tab === 'timeline' && (
        <ol className="relative ml-2 border-l-2 border-sand">
          {timeline.map((ev, i) => {
            const TONES = { slate: 'bg-slate-100 text-slate-600', sky: 'bg-sky-50 text-sky-600', green: 'bg-brand-50 text-brand-700', gold: 'bg-gold-50 text-gold-700' }
            return (
              <li key={i} className="mb-4 ml-5">
                <span className={`absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full ${TONES[ev.tone]}`}><ev.icon size={13} /></span>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-brand-900">{ev.title}</p>
                  <span className="text-xs text-ink/40">{formatDate(ev.date)}</span>
                </div>
                {ev.detail && <p className="text-sm text-ink/55">{ev.detail}</p>}
              </li>
            )
          })}
        </ol>
      )}

      {tab === 'billing' && (
        <ul className="divide-y divide-sand">
          {bills.length === 0 && <EmptyState title="No bills yet" />}
          {bills.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-3">
              <div><p className="font-medium text-brand-900">{b.invoiceNo} · {b.billType}</p><p className="text-sm text-ink/50">{b.department} · {formatDate(b.date)}</p></div>
              <div className="text-right"><p className="font-medium">{inr(b.total)}</p><Badge status={b.status} /></div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
