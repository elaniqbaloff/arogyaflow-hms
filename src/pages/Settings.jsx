import { useState, useRef } from 'react'
import { Settings as SettingsIcon, Plus, Pencil, Trash2, Shield, Building2, UserCog, Database, Download, Upload, RotateCcw, Camera, History } from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can, ROLES, roleLabel } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, Badge, Field, Input, Select, EmptyState, Avatar,
} from '../components/ui/primitives'
import { BRAND } from '../config/brand'
import { departmentHeadName } from '../config/departmentUtils'
import { uid, formatDate } from '../lib/utils'

export default function Settings() {
  const { state, add, update, remove, reseed, importState, exportState, logAudit } = useHospital()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('users')
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const fileRef = useRef(null)

  const canManageUsers = can(user, 'users.create')
  const canManageDemo = can(user, 'demo.manage') || user.role === 'admin'

  const blank = { name: '', email: '', role: 'reception', department: '', password: '', status: 'active' }

  const save = () => {
    const d = form.data
    if (!d.name.trim() || !d.email.trim()) { toast('Name and email are required.', 'error'); return }
    if (form.mode === 'add') { add('users', d); toast(`User ${d.name} created.`) }
    else { update('users', d.id, d); toast(`User ${d.name} updated.`) }
    setForm(null)
  }

  const toggleStatus = (u) => {
    const status = u.status === 'active' ? 'disabled' : 'active'
    update('users', u.id, { status })
    toast(`${u.name} ${status === 'active' ? 'enabled' : 'disabled'}.`, 'info')
  }

  // ── Demo data tools ──
  const downloadJson = (data, name) => {
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    downloadJson(exportState(), 'arogyaflow_demo')
    logAudit({ user, action: 'demo.export', module: 'settings', severity: 'notice' })
    toast('Demo data exported as JSON.')
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!parsed.patients || !parsed.episodes) throw new Error('Not an ArogyaFlow export')
        importState(parsed)
        logAudit({ user, action: 'demo.import', module: 'settings', severity: 'warning' })
        toast('Demo data imported. Refreshing views.')
      } catch (err) {
        toast(`Import failed: ${err.message}`, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSnapshot = () => {
    const snap = { id: uid('snap'), label: `Snapshot ${formatDate(new Date().toISOString())}`, at: new Date().toISOString(), by: user.name, data: exportState() }
    add('snapshots', snap)
    logAudit({ user, action: 'demo.snapshot.create', module: 'settings', recordId: snap.id, severity: 'notice' })
    toast('Snapshot created.')
  }

  const handleRestore = (snap) => {
    try {
      importState(JSON.parse(snap.data))
      logAudit({ user, action: 'demo.snapshot.restore', module: 'settings', recordId: snap.id, severity: 'warning' })
      toast('Snapshot restored.')
    } catch (err) { toast('Restore failed.', 'error') }
  }

  const handleReset = () => {
    reseed()
    logAudit({ user, action: 'demo.reset', module: 'settings', severity: 'warning' })
    toast('Demo data reset to seed.')
  }

  const tabs = [['users', 'Users', UserCog], ['roles', 'Roles & Permissions', Shield], ['departments', 'Departments', Building2], ['profile', 'Hospital Profile', SettingsIcon]]
  if (canManageDemo) tabs.push(['demo', 'Demo Data', Database])

  return (
    <>
      <PageHeader title="Settings & Administration" subtitle="Users, roles, departments and configuration" icon={SettingsIcon} />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-sand/60 p-1 w-fit">
        {tabs.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-sand p-4">
            <p className="text-sm text-ink/50">{state.users.length} staff accounts</p>
            {canManageUsers && <button className="btn-primary btn-sm" onClick={() => setForm({ mode: 'add', data: { ...blank } })}><Plus size={16} /> Add User</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-cream/60">
                <tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Department</th><th className="th">Status</th><th className="th text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {state.users.map((u) => (
                  <tr key={u.id} className="hover:bg-cream/40">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} accent={ROLES[u.role]?.accent} size={32} />
                        <span className="font-medium text-brand-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="td text-ink/60">{u.email}</td>
                    <td className="td">{roleLabel(u.role)}</td>
                    <td className="td">{u.department}</td>
                    <td className="td"><button onClick={() => canManageUsers && toggleStatus(u)} disabled={!canManageUsers}><Badge status={u.status} /></button></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {canManageUsers && <button className="btn-ghost btn-sm" onClick={() => setForm({ mode: 'edit', data: { ...u } })}><Pencil size={15} /></button>}
                        {canManageUsers && u.id !== user.id && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm(u)}><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(ROLES).map(([key, r]) => (
            <div key={key} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: r.accent }} />
                <h3 className="font-semibold text-brand-900">{r.label}</h3>
              </div>
              <p className="mt-1 text-sm text-ink/50">{r.blurb}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Modules</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {r.modules.map((mod) => <span key={mod} className="badge bg-brand-50 text-brand-700 capitalize">{mod}</span>)}
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Capabilities</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {r.capabilities.map((c) => <span key={c} className="badge bg-sand text-ink/60">{c}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'departments' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream/60"><tr><th className="th">Department</th><th className="th">Type</th><th className="th">Head</th></tr></thead>
            <tbody className="divide-y divide-sand">
              {state.departments.map((d) => (
                <tr key={d.id} className="hover:bg-cream/40">
                  <td className="td font-medium text-brand-900">{d.name}</td>
                  <td className="td"><Badge tone={d.type === 'ayurveda' ? 'green' : d.type === 'modern' ? 'sky' : 'gold'}>{d.type}</Badge></td>
                  <td className="td text-ink/60">{departmentHeadName(state, d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'profile' && (
        <div className="space-y-5 max-w-3xl">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-600">Product</div>
            <h3 className="font-display text-xl font-semibold text-brand-900">{BRAND.product}</h3>
            <p className="text-sm text-ink/50">{BRAND.platformType} · <span className="italic">{BRAND.tagline}</span></p>
            <p className="mt-2 text-sm text-ink/60">{BRAND.description}</p>
            <div className="mt-4 rounded-lg bg-cream/60 p-4 text-sm leading-relaxed">
              {BRAND.identityLines.map((l, i) => (
                <p key={i} className={i === 0 ? 'font-semibold text-brand-900' : 'text-ink/60'}>{l}</p>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-brand-900">{BRAND.client.name}</h3>
            <p className="text-sm text-ink/50">Kottakkal, Malappuram, Kerala — NABH Accredited · configured client</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Legacy', '61 years of holistic healing'],
                ['In-patient capacity', '150 beds'],
                ['Departments', `${state.departments.length} active`],
                ['Positioning', 'Where Ayurveda meets modern medicine'],
                ['Address', BRAND.client.address],
                ['Lives improved', '100,000+'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-cream/60 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-ink/40">{k}</p>
                  <p className="mt-1 text-sm font-medium text-ink/80">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-brand-900">Product Roadmap</h3>
            <p className="text-sm text-ink/50">Planned ArogyaFlow editions</p>
            <ul className="mt-4 space-y-2">
              {BRAND.tiers.map((t) => (
                <li key={t.name} className="flex items-start gap-3 rounded-lg bg-cream/50 p-3">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-gold-500" />
                  <div><p className="text-sm font-semibold text-brand-900">{t.name}</p><p className="text-xs text-ink/55">{t.desc}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'demo' && canManageDemo && (
        <div className="space-y-5 max-w-3xl">
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-brand-900">Demo Data Tools</h3>
            <p className="text-sm text-ink/50">Export, import, snapshot and reset the local demo dataset. Every action is audited.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button className="btn-outline justify-start" onClick={handleExport}><Download size={16} /> Export demo as JSON</button>
              <button className="btn-outline justify-start" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import demo from JSON</button>
              <button className="btn-outline justify-start" onClick={handleSnapshot}><Camera size={16} /> Create snapshot</button>
              <button className="btn-danger justify-start" onClick={() => setConfirm({ kind: 'reset' })}><RotateCcw size={16} /> Reset to seed</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-sand px-5 py-3"><h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900"><History size={15} /> Snapshots ({(state.snapshots || []).length})</h4></div>
            {(state.snapshots || []).length === 0 ? (
              <EmptyState title="No snapshots yet" message="Create a snapshot before a demo so you can restore it after." />
            ) : (
              <ul className="divide-y divide-sand">
                {state.snapshots.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div><p className="text-sm font-medium text-brand-900">{s.label}</p><p className="text-xs text-ink/40">by {s.by} · {formatDate(s.at)}</p></div>
                    <div className="flex gap-1">
                      <button className="btn-ghost btn-sm text-brand-700" onClick={() => handleRestore(s)}>Restore</button>
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => remove('snapshots', s.id)}><Trash2 size={15} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* User form */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'add' ? 'Add User' : 'Edit User'}
        footer={<>
          <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>}
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required><Input value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} /></Field>
            <Field label="Email" required><Input value={form.data.email} onChange={(e) => setForm({ ...form, data: { ...form.data, email: e.target.value } })} /></Field>
            <Field label="Role">
              <Select value={form.data.role} onChange={(e) => setForm({ ...form, data: { ...form.data, role: e.target.value } })}>
                {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Department"><Input value={form.data.department} onChange={(e) => setForm({ ...form, data: { ...form.data, department: e.target.value } })} /></Field>
            <Field label="Password" hint="Demo only — not secured"><Input value={form.data.password} onChange={(e) => setForm({ ...form, data: { ...form.data, password: e.target.value } })} /></Field>
            <Field label="Status">
              <Select value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value } })}>
                <option value="active">Active</option><option value="disabled">Disabled</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        confirmLabel={confirm?.kind === 'reset' ? 'Reset' : 'Delete'}
        onConfirm={() => {
          if (confirm?.kind === 'reset') handleReset()
          else { remove('users', confirm.id); toast(`${confirm.name} removed.`, 'info') }
        }}
        title={confirm?.kind === 'reset' ? 'Reset demo data?' : 'Delete user?'}
        message={confirm?.kind === 'reset'
          ? 'This restores the original seed data and discards all changes made in this session.'
          : `${confirm?.name}'s account will be removed.`}
      />
    </>
  )
}
