import { useMemo, useState } from 'react'
import { FlaskConical, Plus, Pencil, Trash2, FileCheck2 } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, Badge, Field, Input, Select, Textarea, SearchInput, EmptyState,
} from '../components/ui/primitives'
import { SmartField } from '../components/ui/SmartField'
import { formatDate, today, uid } from '../lib/utils'

const STATUSES = ['requested', 'in-progress', 'completed']
const COMMON_TESTS = ['Complete Blood Count', 'HbA1c', 'Lipid Profile', 'Liver Function Test', 'Thyroid Profile', 'Vitamin D', 'Urine Routine']

export default function Lab() {
  const { state, add, update, remove, createTask, logAudit } = useHospital()
  const { patientById, patientName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('pending')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null)
  const [result, setResult] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const canManage = can(user, 'lab.update') || can(user, 'lab.create')

  const list = useMemo(() => {
    return state.labTests
      .filter((t) => (tab === 'pending' ? t.status !== 'completed' : tab === 'completed' ? t.status === 'completed' : true))
      .filter((t) => !query || patientName(t.patientId).toLowerCase().includes(query.toLowerCase()) || t.testName.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn))
  }, [state.labTests, tab, query, patientName])

  const blank = {
    patientId: state.patients[0]?.id || '', doctorId: user.id, testName: COMMON_TESTS[0],
    department: 'Diagnostics', requestedOn: today(), status: 'requested', result: '',
  }

  const save = () => {
    const d = form.data
    if (!d.patientId || !d.testName.trim()) { toast('Patient and test name are required.', 'error'); return }
    if (form.mode === 'add') {
      const id = uid('lab')
      add('labTests', { ...d, id })
      const mrn = patientById[d.patientId]?.mrn
      // Doctor → Lab handoff: create a pending lab task + audit entry.
      createTask({ type: 'lab-request', mrn, sourceRole: user.role, createdBy: user.name, relatedId: id, notes: `${d.testName} for ${patientName(d.patientId)}` })
      logAudit({ user, action: 'lab.request.created', module: 'lab', recordId: id, mrn, newValue: d.testName })
      toast(`Test "${d.testName}" requested — Lab notified.`)
    } else { update('labTests', d.id, d); toast('Test request updated.') }
    setForm(null)
  }

  const setStatus = (t, status) => {
    update('labTests', t.id, { status })
    toast(`"${t.testName}" → ${status}.`)
  }

  const saveResult = () => {
    update('labTests', result.id, { result: result.result, status: 'completed' })
    toast(`Result posted for "${result.testName}" — linked to patient record.`)
    setResult(null)
  }

  const counts = {
    pending: state.labTests.filter((t) => t.status !== 'completed').length,
    completed: state.labTests.filter((t) => t.status === 'completed').length,
  }

  return (
    <>
      <PageHeader
        title="Lab & Diagnostics"
        subtitle="Test requests, workload and results"
        icon={FlaskConical}
        actions={canManage && <button className="btn-primary" onClick={() => setForm({ mode: 'add', data: { ...blank } })}><Plus size={18} /> New Test Request</button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
          <div className="flex gap-1 rounded-lg bg-sand/60 p-1">
            {[['pending', `Pending (${counts.pending})`], ['completed', `Completed (${counts.completed})`], ['all', 'All']].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>
                {label}
              </button>
            ))}
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search patient or test…" />
        </div>

        {list.length === 0 ? (
          <EmptyState title="No tests" message="Create a test request to populate the workload." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-cream/60">
                <tr>
                  <th className="th">Test</th>
                  <th className="th">Patient</th>
                  <th className="th">Requested</th>
                  <th className="th">Result</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {list.map((t) => (
                  <tr key={t.id} className="hover:bg-cream/40">
                    <td className="td font-medium text-brand-900">{t.testName}</td>
                    <td className="td">{patientName(t.patientId)}</td>
                    <td className="td text-ink/50">{formatDate(t.requestedOn)}</td>
                    <td className="td max-w-[220px] truncate text-ink/60">{t.result || '—'}</td>
                    <td className="td">
                      {canManage ? (
                        <Select value={t.status} onChange={(e) => setStatus(t, e.target.value)} className="w-auto py-1 text-xs">
                          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </Select>
                      ) : <Badge status={t.status} />}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <button className="btn-ghost btn-sm text-brand-700" title="Enter result" onClick={() => setResult({ ...t })}>
                            <FileCheck2 size={15} />
                          </button>
                        )}
                        {canManage && (
                          <button className="btn-ghost btn-sm" title="Edit" onClick={() => setForm({ mode: 'edit', data: { ...t } })}>
                            <Pencil size={15} />
                          </button>
                        )}
                        {can(user, 'lab.delete') && (
                          <button className="btn-ghost btn-sm text-rose-600" title="Delete" onClick={() => setConfirm(t)}>
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

      {/* New / edit request */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'add' ? 'New Test Request' : 'Edit Test Request'}
        footer={<>
          <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>}
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Patient" required>
              <Select value={form.data.patientId} onChange={(e) => setForm({ ...form, data: { ...form.data, patientId: e.target.value } })}>
                {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Test name" required>
              <SmartField fieldKey="labTestName" value={form.data.testName} onChange={(e) => setForm({ ...form, data: { ...form.data, testName: e.target.value } })} />
            </Field>
            <Field label="Requested on">
              <Input type="date" value={form.data.requestedOn} onChange={(e) => setForm({ ...form, data: { ...form.data, requestedOn: e.target.value } })} />
            </Field>
            <Field label="Status">
              <Select value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value } })}>
                {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Result entry */}
      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title="Enter Result"
        subtitle={result ? `${result.testName} · ${patientName(result.patientId)}` : ''}
        footer={<>
          <button className="btn-outline" onClick={() => setResult(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveResult}>Save &amp; Mark Completed</button>
        </>}
      >
        {result && (
          <Field label="Result / findings">
            <Textarea value={result.result} onChange={(e) => setResult({ ...result, result: e.target.value })} placeholder="e.g. HbA1c 6.4% — within target range." />
          </Field>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { remove('labTests', confirm.id); toast('Test request deleted.', 'info') }}
        title="Delete test request?"
        message="This request will be permanently removed."
      />
    </>
  )
}
