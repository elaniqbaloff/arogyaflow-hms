import { useMemo, useState } from 'react'
import { HeartPulse, Plus, Activity, ClipboardList } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import {
  PageHeader, StatCard, Badge, Field, Input, Select, Textarea, EmptyState, Avatar,
} from '../components/ui/primitives'
import { formatDate, today, uid } from '../lib/utils'

const MED_STATUSES = ['pending', 'given', 'skipped', 'delayed']
const MED_TONE = { pending: 'gold', given: 'green', skipped: 'rose', delayed: 'sky' }

export default function Nursing() {
  const { state, add, update } = useHospital()
  const { patientName, doctorName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [selected, setSelected] = useState(null) // episode
  const [vitalsFor, setVitalsFor] = useState(null)
  const [noteFor, setNoteFor] = useState(null)

  const canChart = can(user, 'vitals.create') || can(user, 'nursing.create')

  // Assigned inpatients. If logged in as the seed nurse, prefer their ward; else show all active IPD.
  const activeIpd = useMemo(
    () => state.episodes.filter((e) => e.type === 'IPD' && e.status === 'admitted'),
    [state.episodes]
  )

  const current = selected ? state.episodes.find((e) => e.id === selected) : activeIpd[0]
  const currentId = current?.id

  const patientVitals = useMemo(
    () => state.vitals.filter((v) => v.episodeId === currentId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [state.vitals, currentId]
  )
  const patientNotes = useMemo(
    () => state.nursingNotes.filter((n) => n.episodeId === currentId).sort((a, b) => b.date.localeCompare(a.date)),
    [state.nursingNotes, currentId]
  )
  // Doctor instructions = latest consultation treatment for this patient
  const docInstruction = useMemo(() => {
    if (!current) return null
    return state.consultations
      .filter((c) => c.patientId === current.patientId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }, [state.consultations, current])

  return (
    <>
      <PageHeader title="Nursing & Vitals" subtitle="Inpatient monitoring, vitals charting and nursing notes" icon={HeartPulse} />

      {activeIpd.length === 0 ? (
        <div className="card"><EmptyState title="No inpatients to chart" message="Vitals and nursing notes apply to admitted IPD patients." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Patient list */}
          <div className="card overflow-hidden lg:col-span-1">
            <div className="border-b border-sand px-4 py-3"><h3 className="text-sm font-semibold text-brand-900">Assigned Inpatients</h3></div>
            <ul className="divide-y divide-sand">
              {activeIpd.map((ep) => (
                <li key={ep.id}>
                  <button
                    onClick={() => setSelected(ep.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream/50 ${ep.id === currentId ? 'bg-brand-50' : ''}`}
                  >
                    <Avatar name={patientName(ep.patientId)} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-900">{patientName(ep.patientId)}</p>
                      <p className="truncate text-xs text-ink/40">{ep.ward} · {ep.refNo}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Detail */}
          <div className="space-y-5 lg:col-span-2">
            {current && (
              <>
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-brand-900">{patientName(current.patientId)}</h3>
                      <p className="text-sm text-ink/50">{current.ward} · {current.diagnosis}</p>
                    </div>
                    {canChart && (
                      <div className="flex gap-2">
                        <button className="btn-outline btn-sm" onClick={() => setVitalsFor(current)}><Activity size={14} /> Add vitals</button>
                        <button className="btn-primary btn-sm" onClick={() => setNoteFor(current)}><Plus size={14} /> Nursing note</button>
                      </div>
                    )}
                  </div>
                  {docInstruction && (
                    <div className="mt-3 rounded-lg bg-cream/70 p-3 text-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Doctor instructions</p>
                      <p className="mt-0.5 text-ink/70">{docInstruction.treatment || docInstruction.notes}</p>
                    </div>
                  )}
                </div>

                {/* Vitals history */}
                <div className="card overflow-hidden">
                  <div className="border-b border-sand px-5 py-3"><h4 className="text-sm font-semibold text-brand-900">Vitals History</h4></div>
                  {patientVitals.length === 0 ? (
                    <EmptyState title="No vitals recorded" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead className="bg-cream/60"><tr>
                          <th className="th">Recorded</th><th className="th">Temp °F</th><th className="th">BP</th><th className="th">Pulse</th>
                          <th className="th">SpO₂</th><th className="th">Resp</th><th className="th">Sugar</th><th className="th">Notes</th>
                        </tr></thead>
                        <tbody className="divide-y divide-sand">
                          {patientVitals.map((v) => (
                            <tr key={v.id} className="hover:bg-cream/40">
                              <td className="td whitespace-nowrap text-ink/50">{formatDate(v.recordedAt)}</td>
                              <td className="td">{v.temp}</td><td className="td">{v.bp}</td><td className="td">{v.pulse}</td>
                              <td className="td">{v.spo2}%</td><td className="td">{v.resp}</td><td className="td">{v.sugar || '—'}</td>
                              <td className="td text-ink/60">{v.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Nursing notes */}
                <div className="card overflow-hidden">
                  <div className="border-b border-sand px-5 py-3"><h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900"><ClipboardList size={15} /> Nursing Notes & Medication</h4></div>
                  {patientNotes.length === 0 ? (
                    <EmptyState title="No nursing notes yet" />
                  ) : (
                    <ul className="divide-y divide-sand">
                      {patientNotes.map((n) => (
                        <li key={n.id} className="px-5 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-ink/40">{formatDate(n.date)}</span>
                            {n.medication && (
                              <span className="flex items-center gap-2 text-xs">
                                <span className="text-ink/50">{n.medication}</span>
                                <Badge tone={MED_TONE[n.medStatus]}>{n.medStatus}</Badge>
                                {can(user, 'nursing.update') && (
                                  <select
                                    value={n.medStatus}
                                    onChange={(e) => { update('nursingNotes', n.id, { medStatus: e.target.value }); toast(`Medication marked ${e.target.value}.`) }}
                                    className="rounded border border-sand bg-white px-1 py-0.5 text-[11px]"
                                  >
                                    {MED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-ink/70">{n.note}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {vitalsFor && <VitalsModal episode={vitalsFor} onClose={() => setVitalsFor(null)} />}
      {noteFor && <NoteModal episode={noteFor} onClose={() => setNoteFor(null)} />}
    </>
  )
}

function VitalsModal({ episode, onClose }) {
  const { add } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [v, setV] = useState({ temp: '', bp: '', pulse: '', spo2: '', resp: '', sugar: '', notes: '' })
  const save = () => {
    add('vitals', { id: uid('vit'), patientId: episode.patientId, episodeId: episode.id, nurseId: user.id, recordedAt: today(), ...v })
    toast('Vitals recorded.')
    onClose()
  }
  const F = (label, key, ph) => <Field label={label}><Input value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} placeholder={ph} /></Field>
  return (
    <Modal open onClose={onClose} title="Record Vitals" subtitle="Added to the patient's IPD chart"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save Vitals</button></>}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {F('Temperature °F', 'temp', '98.6')}
        {F('Blood pressure', 'bp', '120/80')}
        {F('Pulse', 'pulse', '72')}
        {F('SpO₂ %', 'spo2', '98')}
        {F('Respiratory rate', 'resp', '16')}
        {F('Blood sugar', 'sugar', '110')}
      </div>
      <div className="mt-4"><Field label="Notes"><Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
    </Modal>
  )
}

function NoteModal({ episode, onClose }) {
  const { state, add } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState({ note: '', medication: '', medStatus: 'pending' })
  const save = () => {
    if (!data.note.trim()) { toast('Enter a note.', 'error'); return }
    add('nursingNotes', { id: uid('nn'), patientId: episode.patientId, episodeId: episode.id, nurseId: user.id, date: today(), ...data })
    toast('Nursing note added.')
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Add Nursing Note"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save Note</button></>}>
      <div className="space-y-4">
        <Field label="Note" required><Textarea value={data.note} onChange={(e) => setData({ ...data, note: e.target.value })} placeholder="Observation, care provided…" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Medication (optional)">
            <Select value={data.medication} onChange={(e) => setData({ ...data, medication: e.target.value })}>
              <option value="">— none —</option>
              {state.medicines.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Administration status">
            <Select value={data.medStatus} onChange={(e) => setData({ ...data, medStatus: e.target.value })}>
              {MED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
