import { useMemo, useState } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, Badge, Field, Input, Select, SearchInput, EmptyState,
} from '../components/ui/primitives'
import { formatDate, today } from '../lib/utils'

const STATUSES = ['scheduled', 'pending', 'completed', 'cancelled']

export default function Appointments() {
  const { state, add, update, remove } = useHospital()
  const { patientName, doctorName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const canCreate = can(user, 'appointments.create')
  const canEdit = can(user, 'appointments.update')
  const canDelete = can(user, 'appointments.delete')

  const filtered = useMemo(() => {
    return state.appointments
      .filter((a) => {
        const q = query.toLowerCase()
        const matchQ = !q || patientName(a.patientId).toLowerCase().includes(q) || a.reason.toLowerCase().includes(q)
        const matchS = statusFilter === 'all' || a.status === statusFilter
        const matchD = !dateFilter || a.date === dateFilter
        return matchQ && matchS && matchD
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  }, [state.appointments, query, statusFilter, dateFilter, patientName])

  const blank = {
    patientId: state.patients[0]?.id || '',
    doctorId: state.doctors[0]?.id || '',
    department: state.doctors[0]?.department || 'Ayurveda',
    date: today(), time: '09:00', reason: '', status: 'scheduled',
  }

  const save = () => {
    const d = form.data
    if (!d.patientId || !d.reason.trim()) {
      toast('Patient and reason are required.', 'error')
      return
    }
    if (form.mode === 'add') {
      add('appointments', d)
      toast(`Appointment booked for ${patientName(d.patientId)}.`)
    } else {
      update('appointments', d.id, d)
      toast('Appointment updated.')
    }
    setForm(null)
  }

  const setStatus = (a, status) => {
    update('appointments', a.id, { status })
    toast(`Marked ${patientName(a.patientId)}'s appointment as ${status}.`, status === 'cancelled' ? 'info' : 'success')
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Scheduling across all departments"
        icon={CalendarDays}
        actions={canCreate && <button className="btn-primary" onClick={() => setForm({ mode: 'add', data: { ...blank } })}><Plus size={18} /> New Appointment</button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-sand p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search patient or reason…" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </Select>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
          {dateFilter && <button className="btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear date</button>}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No appointments" message="Adjust filters or book a new appointment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-cream/60">
                <tr>
                  <th className="th">Date / Time</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  <th className="th">Department</th>
                  <th className="th">Reason</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/40">
                    <td className="td whitespace-nowrap">
                      <p className="font-medium text-brand-800">{formatDate(a.date)}</p>
                      <p className="text-xs text-ink/40">{a.time}</p>
                    </td>
                    <td className="td">{patientName(a.patientId)}</td>
                    <td className="td">{doctorName(a.doctorId)}</td>
                    <td className="td">{a.department}</td>
                    <td className="td text-ink/60">{a.reason}</td>
                    <td className="td"><Badge status={a.status} /></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && a.status !== 'completed' && (
                          <button className="btn-ghost btn-sm text-brand-700" title="Mark completed" onClick={() => setStatus(a, 'completed')}>
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        {canEdit && a.status !== 'cancelled' && (
                          <button className="btn-ghost btn-sm text-gold-600" title="Cancel" onClick={() => setStatus(a, 'cancelled')}>
                            <XCircle size={15} />
                          </button>
                        )}
                        {canEdit && (
                          <button className="btn-ghost btn-sm" title="Edit" onClick={() => setForm({ mode: 'edit', data: { ...a } })}>
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn-ghost btn-sm text-rose-600" title="Delete" onClick={() => setConfirm(a)}>
                            <Trash2 size={15} />
                          </button>
                        )}
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
        title={form?.mode === 'add' ? 'New Appointment' : 'Edit Appointment'}
        footer={<>
          <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>}
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Patient" required>
              <Select value={form.data.patientId} onChange={(e) => setForm({ ...form, data: { ...form.data, patientId: e.target.value } })}>
                {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
              </Select>
            </Field>
            <Field label="Doctor">
              <Select value={form.data.doctorId} onChange={(e) => {
                const doc = state.doctors.find((x) => x.id === e.target.value)
                setForm({ ...form, data: { ...form.data, doctorId: e.target.value, department: doc?.department || form.data.department } })
              }}>
                {state.doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}
              </Select>
            </Field>
            <Field label="Department">
              <Select value={form.data.department} onChange={(e) => setForm({ ...form, data: { ...form.data, department: e.target.value } })}>
                {state.departments.map((d) => <option key={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value } })}>
                {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={form.data.date} onChange={(e) => setForm({ ...form, data: { ...form.data, date: e.target.value } })} />
            </Field>
            <Field label="Time">
              <Input type="time" value={form.data.time} onChange={(e) => setForm({ ...form, data: { ...form.data, time: e.target.value } })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason / Notes" required>
                <Input value={form.data.reason} onChange={(e) => setForm({ ...form, data: { ...form.data, reason: e.target.value } })} />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { remove('appointments', confirm.id); toast('Appointment deleted.', 'info') }}
        title="Delete appointment?"
        message="This appointment will be permanently removed."
      />
    </>
  )
}
