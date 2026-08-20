import { useMemo, useState } from 'react'
import { FlaskConical, Plus, Pencil, Trash2, FileCheck2, TestTube2, Check, X, Layers, AlertTriangle } from 'lucide-react'
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
import { LAB_PANELS } from '../data/labPanels'

const COMMON_TESTS = ['Complete Blood Count', 'HbA1c', 'Lipid Profile', 'Liver Function Test', 'Thyroid Profile', 'Vitamin D', 'Urine Routine']

// Which single-click action(s) a test's current sample-state allows, per the
// one-way pipeline in repositories.js (ordered → collected → resulted →
// acknowledged, cancellable up to collected). "Enter Result" isn't a
// single-click verb — it opens the result modal, which calls resultEntry
// itself on save.
const LAB_ACTIONS = {
  ordered: [{ verb: 'collect', label: 'Mark Collected', icon: TestTube2 }],
  collected: [{ verb: null, label: 'Enter Result', icon: FileCheck2, opensResultModal: true }],
  resulted: [{ verb: 'acknowledge', label: 'Acknowledge', icon: Check }],
}
const TERMINAL_STATUSES = ['acknowledged', 'cancelled']

export default function Lab() {
  const { state, repos, createTask, logAudit } = useHospital()
  const { patientById, patientName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('pending')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null)
  const [panelForm, setPanelForm] = useState(null)
  const [result, setResult] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const canManage = can(user, 'lab.update') || can(user, 'lab.create')

  const list = useMemo(() => {
    return state.labTests
      .filter((t) => (tab === 'pending' ? !TERMINAL_STATUSES.includes(t.status) : tab === 'completed' ? TERMINAL_STATUSES.includes(t.status) : true))
      .filter((t) => !query || patientName(t.patientId).toLowerCase().includes(query.toLowerCase()) || t.testName.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn))
  }, [state.labTests, tab, query, patientName])

  const blank = {
    patientId: state.patients[0]?.id || '', doctorId: user.id, testName: COMMON_TESTS[0],
    department: 'Diagnostics', requestedOn: today(), result: '',
  }

  const save = () => {
    const d = form.data
    if (!d.patientId || !d.testName.trim()) { toast('Patient and test name are required.', 'error'); return }
    if (form.mode === 'add') {
      const id = repos.labTests.create({ ...d, status: 'ordered' })
      const mrn = patientById[d.patientId]?.mrn
      // Doctor → Lab handoff: create a pending lab task + audit entry.
      createTask({ type: 'lab-request', mrn, sourceRole: user.role, createdBy: user.name, relatedId: id, notes: `${d.testName} for ${patientName(d.patientId)}` })
      logAudit({ user, action: 'lab.request.created', module: 'lab', recordId: id, mrn, newValue: d.testName })
      toast(`Test "${d.testName}" requested — Lab notified.`)
    } else { repos.labTests.update(d.id, d); toast('Test request updated.') }
    setForm(null)
  }

  const savePanel = () => {
    if (!panelForm.patientId) { toast('Choose a patient.', 'error'); return }
    const outcome = repos.labTests.orderPanel(
      panelForm.panelKey, { patientId: panelForm.patientId, doctorId: user.id, requestedOn: panelForm.requestedOn }, user
    )
    if (!outcome.ok) { toast(`Couldn't order panel (${outcome.reason}).`, 'error'); return }
    toast(`${LAB_PANELS[panelForm.panelKey].label} ordered — Lab notified.`)
    setPanelForm(null)
  }

  const doVerb = (verb, test) => {
    const result = repos.labTests[verb](test.id, user)
    if (!result.ok) { toast(`Couldn't update "${test.testName}" (${result.reason}).`, 'error'); return }
    toast(`"${test.testName}" updated.`)
  }

  const saveResult = () => {
    const outcome = repos.labTests.resultEntry(result.id, user, result.result, { critical: result.critical })
    if (!outcome.ok) { toast(`Couldn't save result (${outcome.reason}).`, 'error'); return }
    toast(result.critical
      ? `Result posted for "${result.testName}" — flagged critical, ordering doctor notified.`
      : `Result posted for "${result.testName}" — linked to patient record.`)
    setResult(null)
  }

  const cancelTest = (test) => {
    const outcome = repos.labTests.cancel(test.id, user, 'Cancelled from Lab worklist')
    if (!outcome.ok) { toast(`Couldn't cancel "${test.testName}" (${outcome.reason}).`, 'error'); return }
    toast(`"${test.testName}" cancelled.`, 'info')
  }

  const counts = {
    pending: state.labTests.filter((t) => !TERMINAL_STATUSES.includes(t.status)).length,
    completed: state.labTests.filter((t) => TERMINAL_STATUSES.includes(t.status)).length,
  }

  return (
    <>
      <PageHeader
        title="Lab & Diagnostics"
        subtitle="Test requests, workload and results"
        icon={FlaskConical}
        actions={canManage && (
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setPanelForm({ patientId: state.patients[0]?.id || '', panelKey: Object.keys(LAB_PANELS)[0], requestedOn: today() })}>
              <Layers size={18} /> Order a Panel
            </button>
            <button className="btn-primary" onClick={() => setForm({ mode: 'add', data: { ...blank } })}><Plus size={18} /> New Test Request</button>
          </div>
        )}
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
                  <tr key={t.id} className={t.critical ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-cream/40'}>
                    <td className="td font-medium text-brand-900">
                      {t.critical && <AlertTriangle size={14} className="mr-1 inline-block align-middle text-rose-600" />}
                      {t.testName}
                      {t.panelLabel && <span className="ml-2 inline-block align-middle"><Badge tone="slate">{t.panelLabel}</Badge></span>}
                    </td>
                    <td className="td">{patientName(t.patientId)}</td>
                    <td className="td text-ink/50">{formatDate(t.requestedOn)}</td>
                    <td className="td max-w-[220px] truncate text-ink/60" title={t.critical ? 'Critical result' : undefined}>{t.result || '—'}</td>
                    <td className="td"><Badge status={t.status} /></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (LAB_ACTIONS[t.status] || []).map((a) => (
                          <button
                            key={a.label} className="btn-ghost btn-sm text-brand-700" title={a.label}
                            onClick={() => (a.opensResultModal ? setResult({ ...t, critical: false }) : doVerb(a.verb, t))}
                          >
                            <a.icon size={15} />
                          </button>
                        ))}
                        {canManage && ['ordered', 'collected'].includes(t.status) && (
                          <button className="btn-ghost btn-sm text-rose-600" title="Cancel" onClick={() => cancelTest(t)}>
                            <X size={15} />
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
          </div>
        )}
      </Modal>

      {/* Order a panel — several tests at once (§11 Phase 7b) */}
      <Modal
        open={!!panelForm}
        onClose={() => setPanelForm(null)}
        title="Order a Panel"
        footer={<>
          <button className="btn-outline" onClick={() => setPanelForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={savePanel}>Order Panel</button>
        </>}
      >
        {panelForm && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Patient" required>
              <Select value={panelForm.patientId} onChange={(e) => setPanelForm({ ...panelForm, patientId: e.target.value })}>
                {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Panel" required>
              <Select value={panelForm.panelKey} onChange={(e) => setPanelForm({ ...panelForm, panelKey: e.target.value })}>
                {Object.entries(LAB_PANELS).map(([key, p]) => (
                  <option key={key} value={key}>{p.label} ({p.tests.length} tests)</option>
                ))}
              </Select>
            </Field>
            <Field label="Requested on">
              <Input type="date" value={panelForm.requestedOn} onChange={(e) => setPanelForm({ ...panelForm, requestedOn: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 rounded-lg bg-cream/60 p-3 text-xs text-ink/60">
              Creates {LAB_PANELS[panelForm.panelKey].tests.length} individual test requests: {LAB_PANELS[panelForm.panelKey].tests.join(', ')}.
            </div>
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
          <button className="btn-primary" onClick={saveResult}>Save Result</button>
        </>}
      >
        {result && (
          <div className="space-y-3">
            <Field label="Result / findings">
              <Textarea value={result.result} onChange={(e) => setResult({ ...result, result: e.target.value })} placeholder="e.g. HbA1c 6.4% — within target range." />
            </Field>
            <label className="flex items-center gap-2 text-sm text-rose-700">
              <input type="checkbox" checked={!!result.critical} onChange={(e) => setResult({ ...result, critical: e.target.checked })} />
              Mark as critical — notifies the ordering doctor immediately
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { repos.labTests.remove(confirm.id); toast('Test request deleted.', 'info') }}
        title="Delete test request?"
        message="This request will be permanently removed."
      />
    </>
  )
}
