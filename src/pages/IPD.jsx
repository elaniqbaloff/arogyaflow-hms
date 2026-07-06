import { useMemo, useState } from 'react'
import { BedDouble, Plus, ArrowRightLeft, LogOut, Eye, UserPlus, ShieldCheck, Check } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, StatCard, Badge, Field, Input, Select, Textarea, EmptyState,
} from '../components/ui/primitives'
import { formatDate, today, daysFromNow, uid, codeNo, mrnTail } from '../lib/utils'
import {
  CLEARANCE_GATES, emptyClearance, clearanceProgress, allGatesCleared,
  deriveDischargeStatus, canOverrideDischarge,
} from '../services/discharge'

const BED_TONES = {
  available: 'border-brand-200 bg-brand-50 text-brand-700',
  occupied: 'border-rose-200 bg-rose-50 text-rose-700',
  cleaning: 'border-gold-200 bg-gold-50 text-gold-700',
  maintenance: 'border-slate-200 bg-slate-100 text-slate-600',
  reserved: 'border-sky-200 bg-sky-50 text-sky-700',
}
const BED_STATUSES = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved']

export default function IPD() {
  const { state, admitPatient, transferBed, dischargePatient, update, add, clearGate, overrideDischarge, logAudit, createTask } = useHospital()
  const { patientName, doctorName, nurseName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [admitOpen, setAdmitOpen] = useState(false)
  const [transferFor, setTransferFor] = useState(null)
  const [dischargeFor, setDischargeFor] = useState(null)
  const [detail, setDetail] = useState(null)

  const canAdmit = can(user, 'ipd.admit')
  const canTransfer = can(user, 'ipd.transfer')
  const canDischarge = can(user, 'ipd.discharge')

  const activeIpd = useMemo(
    () => state.episodes.filter((e) => e.type === 'IPD' && e.status === 'admitted'),
    [state.episodes]
  )
  const wards = useMemo(() => {
    const map = {}
    state.beds.forEach((b) => { (map[b.ward] = map[b.ward] || []).push(b) })
    return map
  }, [state.beds])

  const counts = useMemo(() => {
    const total = state.beds.length
    const available = state.beds.filter((b) => b.status === 'available').length
    const occupied = state.beds.filter((b) => b.status === 'occupied').length
    return { total, available, occupied, occupancy: total ? Math.round((occupied / total) * 100) : 0 }
  }, [state.beds])

  const setBedStatus = (bed, status) => {
    if (bed.status === 'occupied') { toast('Cannot change an occupied bed directly. Discharge or transfer first.', 'error'); return }
    update('beds', bed.id, { status })
    toast(`${bed.ward} · ${bed.bedNo} → ${status}.`, 'info')
  }

  return (
    <>
      <PageHeader
        title="IPD & Bed Management"
        subtitle="Inpatient admissions, ward occupancy and bed status"
        icon={BedDouble}
        actions={canAdmit && <button className="btn-primary" onClick={() => setAdmitOpen(true)}><UserPlus size={18} /> Admit Patient</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Beds" value={counts.total} icon={BedDouble} />
        <StatCard label="Available" value={counts.available} icon={BedDouble} tone="brand" />
        <StatCard label="Occupied" value={counts.occupied} icon={BedDouble} tone="rose" />
        <StatCard label="Occupancy" value={`${counts.occupancy}%`} icon={BedDouble} tone="gold" />
      </div>

      {/* Bed dashboard by ward */}
      <div className="space-y-5">
        {Object.entries(wards).map(([ward, list]) => (
          <div key={ward} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-brand-900">{ward}</h3>
              <span className="text-xs text-ink/40">{list.filter((b) => b.status === 'available').length} available · {list.length} beds</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {list.map((bed) => (
                <div key={bed.id} className={`rounded-xl border p-3 ${BED_TONES[bed.status]}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{bed.bedNo}</span>
                    <span className="text-[10px] uppercase tracking-wide">{bed.status}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-70">{bed.room}</p>
                  {bed.patientId ? (
                    <p className="mt-1 truncate text-xs font-medium">{patientName(bed.patientId)}</p>
                  ) : (
                    can(user, 'ipd.admit') && bed.status !== 'occupied' ? (
                      <select
                        value={bed.status}
                        onChange={(e) => setBedStatus(bed, e.target.value)}
                        className="mt-1 w-full rounded border-0 bg-white/60 px-1 py-0.5 text-[11px] focus:outline-none"
                      >
                        {BED_STATUSES.filter((s) => s !== 'occupied').map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <p className="mt-1 text-xs opacity-50">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active admissions */}
      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-sand px-5 py-4">
          <h3 className="font-semibold text-brand-900">Active Admissions ({activeIpd.length})</h3>
        </div>
        {activeIpd.length === 0 ? (
          <EmptyState title="No active inpatients" message="Admit a patient to populate the ward." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-cream/60">
                <tr>
                  <th className="th">IPD Ref</th><th className="th">Patient</th><th className="th">Ward / Bed</th>
                  <th className="th">Doctor</th><th className="th">Nurse</th><th className="th">Admitted</th>
                  <th className="th">Exp. Discharge</th><th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {activeIpd.map((ep) => {
                  const bed = state.beds.find((b) => b.id === ep.bedId)
                  return (
                    <tr key={ep.id} className="hover:bg-cream/40">
                      <td className="td font-mono text-xs text-brand-800">{ep.refNo}</td>
                      <td className="td font-medium">{patientName(ep.patientId)}</td>
                      <td className="td">{ep.ward}{bed ? ` · ${bed.bedNo}` : ''}</td>
                      <td className="td">{doctorName(ep.doctorId)}</td>
                      <td className="td">{nurseName(ep.nurseId)}</td>
                      <td className="td text-ink/50">{formatDate(ep.admitDate)}</td>
                      <td className="td text-ink/50">{formatDate(ep.expectedDischarge)}</td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-ghost btn-sm" title="View" onClick={() => setDetail(ep)}><Eye size={15} /></button>
                          {canTransfer && <button className="btn-ghost btn-sm" title="Transfer bed" onClick={() => setTransferFor(ep)}><ArrowRightLeft size={15} /></button>}
                          {canDischarge && <button className="btn-ghost btn-sm text-gold-600" title="Discharge" onClick={() => setDischargeFor(ep)}><LogOut size={15} /></button>}
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

      {admitOpen && <AdmitModal onClose={() => setAdmitOpen(false)} />}
      {transferFor && <TransferModal episode={transferFor} onClose={() => setTransferFor(null)} />}
      {dischargeFor && (
        <DischargeModal
          episode={state.episodes.find((e) => e.id === dischargeFor.id) || dischargeFor}
          onClose={() => setDischargeFor(null)}
          user={user}
          patientName={patientName}
          clearGate={clearGate}
          overrideDischarge={overrideDischarge}
          dischargePatient={dischargePatient}
          logAudit={logAudit}
          toast={toast}
        />
      )}
      {detail && <IpdDetail episode={detail} onClose={() => setDetail(null)} />}
    </>
  )
}

function AdmitModal({ onClose }) {
  const { state, admitPatient } = useHospital()
  const { activeIpdFor } = useLookups()
  const toast = useToast()
  const availableBeds = state.beds.filter((b) => b.status === 'available')
  // Patients not currently admitted
  const eligible = state.patients.filter((p) => !activeIpdFor(p.id))

  const [data, setData] = useState({
    patientId: eligible[0]?.id || '',
    bedId: availableBeds[0]?.id || '',
    doctorId: state.doctors[0]?.id || '',
    nurseId: state.nurses[0]?.id || '',
    admitDate: today(),
    expectedDischarge: daysFromNow(5),
    diagnosis: '',
    reason: '',
    advance: 0,
  })

  const save = () => {
    if (!data.patientId || !data.bedId) { toast('Pick a patient and an available bed.', 'error'); return }
    const patient = state.patients.find((p) => p.id === data.patientId)
    const bed = state.beds.find((b) => b.id === data.bedId)
    const seq = state.episodes.filter((e) => e.patientId === patient.id && e.type === 'IPD').length + 1
    const mrnNum = mrnTail(patient.mrn)
    admitPatient({
      id: uid('ep'), patientId: patient.id, mrn: patient.mrn,
      refNo: `IPD-${mrnNum}-${String(seq).padStart(2, '0')}`,
      date: data.admitDate, department: bed.ward, doctorId: data.doctorId, nurseId: data.nurseId,
      ward: bed.ward, admitDate: data.admitDate, expectedDischarge: data.expectedDischarge,
      diagnosis: data.diagnosis, reason: data.reason, advance: Number(data.advance) || 0,
    }, data.bedId)
    toast(`${patient.name} admitted to ${bed.ward} · ${bed.bedNo}.`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Admit Patient to IPD" subtitle="Creates an IPD episode under the patient's existing MRN"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Admit</button></>}>
      {availableBeds.length === 0 ? (
        <p className="text-sm text-rose-600">No available beds. Free a bed (discharge or set to available) first.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Patient" required>
            <Select value={data.patientId} onChange={(e) => setData({ ...data, patientId: e.target.value })}>
              {eligible.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
            </Select>
          </Field>
          <Field label="Bed" required>
            <Select value={data.bedId} onChange={(e) => setData({ ...data, bedId: e.target.value })}>
              {availableBeds.map((b) => <option key={b.id} value={b.id}>{b.ward} · {b.bedNo} ({b.room})</option>)}
            </Select>
          </Field>
          <Field label="Admitting doctor">
            <Select value={data.doctorId} onChange={(e) => setData({ ...data, doctorId: e.target.value })}>
              {state.doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Assigned nurse">
            <Select value={data.nurseId} onChange={(e) => setData({ ...data, nurseId: e.target.value })}>
              {state.nurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </Select>
          </Field>
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

function TransferModal({ episode, onClose }) {
  const { state, transferBed } = useHospital()
  const { patientName } = useLookups()
  const toast = useToast()
  const availableBeds = state.beds.filter((b) => b.status === 'available')
  const [toBedId, setToBedId] = useState(availableBeds[0]?.id || '')
  const [reason, setReason] = useState('')

  const save = () => {
    if (!toBedId) { toast('Select a destination bed.', 'error'); return }
    transferBed(episode.id, toBedId, reason || 'Bed transfer', today())
    const bed = state.beds.find((b) => b.id === toBedId)
    toast(`${patientName(episode.patientId)} transferred to ${bed.ward} · ${bed.bedNo}.`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Transfer Bed" subtitle={`${patientName(episode.patientId)} · currently ${episode.ward}`}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Transfer</button></>}>
      {availableBeds.length === 0 ? (
        <p className="text-sm text-rose-600">No available beds to transfer to.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Destination bed" required>
            <Select value={toBedId} onChange={(e) => setToBedId(e.target.value)}>
              {availableBeds.map((b) => <option key={b.id} value={b.id}>{b.ward} · {b.bedNo} ({b.room})</option>)}
            </Select>
          </Field>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Patient upgrade request" /></Field>
        </div>
      )}
    </Modal>
  )
}

function IpdDetail({ episode, onClose }) {
  const { state } = useHospital()
  const { patientName, doctorName, nurseName } = useLookups()
  const bed = state.beds.find((b) => b.id === episode.bedId)
  const Row = ({ label, value }) => (
    <div><p className="text-[11px] uppercase tracking-wide text-ink/40">{label}</p><p className="mt-0.5 text-sm text-ink/80">{value || '—'}</p></div>
  )
  return (
    <Modal open onClose={onClose} title={`IPD Admission · ${episode.refNo}`} subtitle={patientName(episode.patientId)} size="lg">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Row label="Ward / Bed" value={`${episode.ward}${bed ? ' · ' + bed.bedNo : ''}`} />
        <Row label="Doctor" value={doctorName(episode.doctorId)} />
        <Row label="Nurse" value={nurseName(episode.nurseId)} />
        <Row label="Admitted" value={formatDate(episode.admitDate)} />
        <Row label="Expected discharge" value={formatDate(episode.expectedDischarge)} />
        <Row label="Advance" value={episode.advance ? `₹${episode.advance}` : '—'} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4">
        <Row label="Diagnosis" value={episode.diagnosis} />
        <Row label="Reason for admission" value={episode.reason} />
      </div>
      {episode.transfers?.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-brand-900">Bed transfer history</h4>
          <ul className="mt-1 divide-y divide-sand text-sm text-ink/70">
            {episode.transfers.map((t, i) => (
              <li key={i} className="py-2">{formatDate(t.date)} — {t.from} → {t.to} ({t.reason})</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

function DischargeModal({ episode, onClose, user, patientName, clearGate, overrideDischarge, dischargePatient, logAudit, toast }) {
  const clearance = episode.clearance || emptyClearance()
  const progress = clearanceProgress(clearance)
  const cleared = allGatesCleared(clearance)
  const statusLabel = deriveDischargeStatus(episode)
  const mayOverride = canOverrideDischarge(user.role)
  const [overrideReason, setOverrideReason] = useState('')

  const doGate = (gate) => {
    clearGate(episode.id, gate, user.name)
    logAudit({ user, action: `discharge.gate.${gate}`, module: 'ipd', recordId: episode.id, mrn: episode.mrn, newValue: 'cleared' })
    toast(`${gate} clearance recorded.`)
  }

  const finalize = () => {
    if (!cleared && !clearance.override) {
      if (!mayOverride) { toast('All clearances must be completed first.', 'error'); return }
      if (!overrideReason.trim()) { toast('Override requires a reason.', 'error'); return }
      overrideDischarge(episode.id, user.name, user.role, overrideReason)
      logAudit({ user, action: 'discharge.override', module: 'ipd', recordId: episode.id, mrn: episode.mrn, remarks: overrideReason, severity: 'warning' })
    }
    dischargePatient(episode.id, today())
    logAudit({ user, action: 'discharge.completed', module: 'ipd', recordId: episode.id, mrn: episode.mrn, newValue: 'discharged', severity: 'notice' })
    toast(`${patientName(episode.patientId)} discharged. Bed freed for cleaning.`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Discharge Clearance" subtitle={`${patientName(episode.patientId)} · ${episode.refNo}`} size="lg"
      footer={<>
        <button className="btn-outline" onClick={onClose}>Close</button>
        <button className="btn-primary" onClick={finalize} disabled={!cleared && !clearance.override && !canOverrideDischarge(user.role)}>
          <LogOut size={16} /> {cleared || clearance.override ? 'Complete Discharge' : 'Override & Discharge'}
        </button>
      </>}>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-cream/60 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink/40">Current status</p>
          <p className="mt-0.5 font-medium text-brand-900">{statusLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-brand-800">{progress.pct}%</p>
          <p className="text-xs text-ink/45">{progress.done}/{progress.total} cleared</p>
        </div>
      </div>

      <div className="space-y-2">
        {CLEARANCE_GATES.map((g) => {
          const done = clearance[g.key]?.done
          return (
            <div key={g.key} className={`flex items-center justify-between rounded-lg border p-3 ${done ? 'border-brand-200 bg-brand-50' : 'border-sand bg-white'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-brand-600 text-white' : 'bg-sand text-ink/40'}`}>
                  {done ? <Check size={15} /> : <ShieldCheck size={14} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-900">{g.label}</p>
                  {done && <p className="text-[11px] text-ink/40">by {clearance[g.key].by} · {formatDate(clearance[g.key].at)}</p>}
                </div>
              </div>
              {!done && <button className="btn-ghost btn-sm text-brand-700" onClick={() => doGate(g.key)}>Mark cleared</button>}
            </div>
          )
        })}
      </div>

      {clearance.override && (
        <p className="mt-4 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-700">
          Override recorded by {clearance.override.by}: “{clearance.override.reason}”
        </p>
      )}

      {!cleared && !clearance.override && (
        <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50/50 p-4">
          {canOverrideDischarge(user.role) ? (
            <>
              <p className="text-sm font-medium text-gold-800">Admin/Management override</p>
              <p className="mb-2 text-xs text-ink/50">Discharge before all clearances are complete. This is audited.</p>
              <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason for override…" />
            </>
          ) : (
            <p className="text-sm text-ink/60">Complete all clearances to enable discharge. Only Admin/Management can override.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
