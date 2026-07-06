import { useMemo, useState } from 'react'
import { Flower2, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, StatCard, Badge, Field, Input, Select, Textarea, SearchInput, EmptyState,
} from '../components/ui/primitives'
import { inr, formatDate, today } from '../lib/utils'

const THERAPY_TYPES = ['Abhyanga', 'Shirodhara', 'Pizhichil', 'Njavarakizhi', 'Virechana', 'Basti', 'Nasya', 'Kizhi', 'Kati Basti', 'Ayurvedic consultation follow-up']
const STATUSES = ['scheduled', 'in-progress', 'completed', 'cancelled']

export default function Therapy() {
  const { state, add, update, remove } = useHospital()
  const { patientName, doctorName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const canManage = can(user, 'therapy.create')
  const canEdit = can(user, 'therapy.update')

  const list = useMemo(() => {
    return state.therapies
      .filter((t) => (tab === 'all' ? true : t.status === tab))
      .filter((t) => !query || patientName(t.patientId).toLowerCase().includes(query.toLowerCase()) || t.type.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [state.therapies, tab, query, patientName])

  const stats = useMemo(() => ({
    today: state.therapies.filter((t) => t.date === today()).length,
    scheduled: state.therapies.filter((t) => t.status === 'scheduled').length,
    completed: state.therapies.filter((t) => t.status === 'completed').length,
    revenue: state.therapies.filter((t) => t.status === 'completed').reduce((s, t) => s + (t.cost || 0), 0),
  }), [state.therapies])

  const blank = {
    patientId: state.patients[0]?.id || '', episodeId: null, type: THERAPY_TYPES[0],
    therapistId: state.doctors[0]?.id || '', date: today(), status: 'scheduled', cost: 1500, notes: '', instructionsAr: '',
  }

  const save = () => {
    const d = form.data
    if (!d.patientId || !d.type) { toast('Patient and therapy type are required.', 'error'); return }
    const clean = { ...d, cost: Number(d.cost) || 0 }
    if (form.mode === 'add') { add('therapies', clean); toast(`${d.type} scheduled for ${patientName(d.patientId)}.`) }
    else { update('therapies', d.id, clean); toast('Therapy session updated.') }
    setForm(null)
  }

  const setStatus = (t, status) => { update('therapies', t.id, { status }); toast(`${t.type} → ${status}.`) }

  return (
    <>
      <PageHeader
        title="Panchakarma & Ayurveda Therapy"
        subtitle="Therapy scheduling, sessions and progress"
        icon={Flower2}
        actions={canManage && <button className="btn-primary" onClick={() => setForm({ mode: 'add', data: { ...blank } })}><Plus size={18} /> Schedule Therapy</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Sessions" value={stats.today} icon={Flower2} />
        <StatCard label="Scheduled" value={stats.scheduled} icon={Flower2} tone="sky" />
        <StatCard label="Completed" value={stats.completed} icon={Flower2} tone="brand" />
        <StatCard label="Therapy Revenue" value={inr(stats.revenue)} icon={Flower2} tone="gold" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
          <div className="flex flex-wrap gap-1 rounded-lg bg-sand/60 p-1">
            {['all', ...STATUSES].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${tab === t ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>
                {t}
              </button>
            ))}
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search patient or therapy…" />
        </div>

        {list.length === 0 ? (
          <EmptyState title="No therapy sessions" message="Schedule a Panchakarma session to begin." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Therapy</th><th className="th">Patient</th><th className="th">Therapist</th>
                <th className="th">Date</th><th className="th text-right">Cost</th><th className="th">Status</th><th className="th text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {list.map((t) => (
                  <tr key={t.id} className="hover:bg-cream/40">
                    <td className="td">
                      <p className="font-medium text-brand-900">{t.type}</p>
                      {t.notes && <p className="text-xs text-ink/40 max-w-[260px] truncate">{t.notes}</p>}
                    </td>
                    <td className="td">{patientName(t.patientId)}</td>
                    <td className="td">{doctorName(t.therapistId)}</td>
                    <td className="td text-ink/50">{formatDate(t.date)}</td>
                    <td className="td text-right">{inr(t.cost)}</td>
                    <td className="td">
                      {canEdit ? (
                        <Select value={t.status} onChange={(e) => setStatus(t, e.target.value)} className="w-auto py-1 text-xs">
                          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </Select>
                      ) : <Badge status={t.status} />}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && <button className="btn-ghost btn-sm" title="Edit" onClick={() => setForm({ mode: 'edit', data: { ...t } })}><Pencil size={15} /></button>}
                        {canManage && <button className="btn-ghost btn-sm text-rose-600" title="Delete" onClick={() => setConfirm(t)}><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'add' ? 'Schedule Therapy' : 'Edit Therapy Session'}
        subtitle="Panchakarma / Ayurveda therapy"
        footer={<><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Patient" required>
              <Select value={form.data.patientId} onChange={(e) => setForm({ ...form, data: { ...form.data, patientId: e.target.value } })}>
                {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Therapy type" required>
              <Select value={form.data.type} onChange={(e) => setForm({ ...form, data: { ...form.data, type: e.target.value } })}>
                {THERAPY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Therapist / Doctor">
              <Select value={form.data.therapistId} onChange={(e) => setForm({ ...form, data: { ...form.data, therapistId: e.target.value } })}>
                {state.doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={form.data.date} onChange={(e) => setForm({ ...form, data: { ...form.data, date: e.target.value } })} /></Field>
            <Field label="Status">
              <Select value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value } })}>
                {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </Select>
            </Field>
            <Field label="Session cost (₹)"><Input type="number" value={form.data.cost} onChange={(e) => setForm({ ...form, data: { ...form.data, cost: e.target.value } })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes / instructions"><Textarea value={form.data.notes} onChange={(e) => setForm({ ...form, data: { ...form.data, notes: e.target.value } })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Patient instructions (Arabic)" hint="Optional — shown on Arabic/bilingual therapy plan"><Textarea dir="rtl" value={form.data.instructionsAr} onChange={(e) => setForm({ ...form, data: { ...form.data, instructionsAr: e.target.value } })} /></Field></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { remove('therapies', confirm.id); toast('Therapy session deleted.', 'info') }}
        title="Delete therapy session?"
        message={confirm ? `${confirm.type} for ${patientName(confirm.patientId)} will be removed.` : ''}
      />
    </>
  )
}
