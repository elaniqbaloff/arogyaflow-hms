import { useMemo, useState } from 'react'
import { Pill, Plus, Pencil, Trash2, PackageCheck, AlertTriangle } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, Badge, Field, Input, Select, SearchInput, EmptyState,
} from '../components/ui/primitives'
import { inr, formatDate } from '../lib/utils'

const empty = { name: '', category: 'ayurveda', unit: 'bottle', stock: 0, reorderLevel: 10, price: 0, expiry: '' }

export default function Pharmacy() {
  const { state, add, update, remove, dispense } = useHospital()
  const { patientName } = useLookups()
  const toast = useToast()

  const [tab, setTab] = useState('inventory')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const meds = useMemo(
    () => state.medicines.filter((m) => !query || m.name.toLowerCase().includes(query.toLowerCase())),
    [state.medicines, query]
  )
  const pendingRx = state.prescriptions.filter((r) => r.status === 'pending')

  const save = () => {
    const d = form.data
    if (!d.name.trim()) { toast('Medicine name is required.', 'error'); return }
    const clean = { ...d, stock: Number(d.stock) || 0, reorderLevel: Number(d.reorderLevel) || 0, price: Number(d.price) || 0 }
    if (form.mode === 'add') { add('medicines', clean); toast(`${d.name} added to inventory.`) }
    else { update('medicines', d.id, clean); toast(`${d.name} updated.`) }
    setForm(null)
  }

  const doDispense = (rx) => {
    dispense(rx.id)
    toast(`Dispensed ${rx.items.length} item(s) for ${patientName(rx.patientId)}. Stock updated.`)
  }

  return (
    <>
      <PageHeader
        title="Pharmacy"
        subtitle="Inventory & prescription fulfilment (Ayurveda + Modern)"
        icon={Pill}
        actions={<button className="btn-primary" onClick={() => setForm({ mode: 'add', data: { ...empty } })}><Plus size={18} /> Add Medicine</button>}
      />

      <div className="mb-4 flex gap-1 rounded-lg bg-sand/60 p-1 w-fit">
        {[['inventory', 'Inventory'], ['prescriptions', `Prescriptions (${pendingRx.length})`]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="card overflow-hidden">
          <div className="border-b border-sand p-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search medicines…" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-cream/60">
                <tr>
                  <th className="th">Medicine</th>
                  <th className="th">Category</th>
                  <th className="th">Stock</th>
                  <th className="th">Price</th>
                  <th className="th">Expiry</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {meds.map((m) => {
                  const low = m.stock <= m.reorderLevel
                  return (
                    <tr key={m.id} className="hover:bg-cream/40">
                      <td className="td font-medium text-brand-900">{m.name}</td>
                      <td className="td"><Badge tone={m.category === 'ayurveda' ? 'green' : 'sky'}>{m.category}</Badge></td>
                      <td className="td">
                        <span className={low ? 'font-semibold text-rose-600' : 'font-medium'}>{m.stock}</span>
                        <span className="text-ink/40"> {m.unit}</span>
                        {low && <span className="ml-2 inline-flex items-center gap-1 text-xs text-rose-600"><AlertTriangle size={12} /> low</span>}
                      </td>
                      <td className="td">{inr(m.price)}</td>
                      <td className="td text-ink/50">{formatDate(m.expiry)}</td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-ghost btn-sm" onClick={() => setForm({ mode: 'edit', data: { ...m } })}><Pencil size={15} /></button>
                          <button className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm(m)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'prescriptions' && (
        <div className="card overflow-hidden">
          {pendingRx.length === 0 ? (
            <EmptyState title="No pending prescriptions" message="All prescriptions have been dispensed." />
          ) : (
            <ul className="divide-y divide-sand">
              {pendingRx.map((rx) => (
                <li key={rx.id} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-cream/40">
                  <div>
                    <p className="font-medium text-brand-900">{patientName(rx.patientId)}</p>
                    <p className="text-sm text-ink/60">{rx.items.map((i) => `${i.name} ×${i.qty} (${i.dosage})`).join(' · ')}</p>
                    <p className="text-xs text-ink/40 mt-0.5">Prescribed {formatDate(rx.createdOn)}</p>
                  </div>
                  <button className="btn-gold" onClick={() => doDispense(rx)}><PackageCheck size={16} /> Dispense</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'add' ? 'Add Medicine' : 'Edit Medicine'}
        footer={<>
          <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>}
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Medicine name" required>
                <Input value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} />
              </Field>
            </div>
            <Field label="Category">
              <Select value={form.data.category} onChange={(e) => setForm({ ...form, data: { ...form.data, category: e.target.value } })}>
                <option value="ayurveda">Ayurveda</option><option value="modern">Modern</option>
              </Select>
            </Field>
            <Field label="Unit">
              <Select value={form.data.unit} onChange={(e) => setForm({ ...form, data: { ...form.data, unit: e.target.value } })}>
                <option>bottle</option><option>strip</option><option>box</option><option>tube</option>
              </Select>
            </Field>
            <Field label="Stock quantity">
              <Input type="number" value={form.data.stock} onChange={(e) => setForm({ ...form, data: { ...form.data, stock: e.target.value } })} />
            </Field>
            <Field label="Reorder level">
              <Input type="number" value={form.data.reorderLevel} onChange={(e) => setForm({ ...form, data: { ...form.data, reorderLevel: e.target.value } })} />
            </Field>
            <Field label="Price (₹)">
              <Input type="number" value={form.data.price} onChange={(e) => setForm({ ...form, data: { ...form.data, price: e.target.value } })} />
            </Field>
            <Field label="Expiry date">
              <Input type="date" value={form.data.expiry} onChange={(e) => setForm({ ...form, data: { ...form.data, expiry: e.target.value } })} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { remove('medicines', confirm.id); toast(`${confirm.name} removed.`, 'info') }}
        title="Remove medicine?"
        message={`${confirm?.name} will be removed from inventory.`}
      />
    </>
  )
}
