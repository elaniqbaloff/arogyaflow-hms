import { useMemo, useState } from 'react'
import { Receipt, Plus, Pencil, Trash2, IndianRupee, Wallet, Clock, Eye, Printer, FileStack, ReceiptText } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import {
  PageHeader, StatCard, Badge, Field, Input, Select, SearchInput, EmptyState,
} from '../components/ui/primitives'
import { inr, formatDate, today, codeNo, uid } from '../lib/utils'
import { computeBill } from '../lib/billing'
import { printInvoice } from '../lib/printDocument'

const BILL_TYPES = ['OPD', 'IPD', 'Pharmacy', 'Lab', 'Panchakarma']

// Best-effort bill type guess when generating an invoice from pending
// billableItems — these items only carry a department string, never a
// bill type, so this maps the departments actually seen in practice
// (Panchakarma therapy, Dental procedures, Physio sessions, IPD nursing)
// to the closest BILL_TYPES value. Falls back to 'OPD'.
const inferBillType = (department, hasIpdEpisode) => {
  if (hasIpdEpisode) return 'IPD'
  if (department === 'Panchakarma') return 'Panchakarma'
  if (department === 'Lab' || department === 'Diagnostics') return 'Lab'
  if (department === 'Pharmacy') return 'Pharmacy'
  return 'OPD'
}

export default function Billing() {
  const { state, add, update, remove } = useHospital()
  const { patientById, patientName, doctorName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [form, setForm] = useState(null)
  const [view, setView] = useState(null)
  const [confirm, setConfirm] = useState(null)

  // Pending billable items (procedure/therapy/session completions awaiting
  // invoicing — see repositories.js's completeItem/applyPhysioSessionCompletion
  // and workflowSeed.js's seeded rows). This is the first UI that reads
  // state.billableItems at all — until now it was write-only.
  const [pendingQuery, setPendingQuery] = useState('')
  const [pendingDeptFilter, setPendingDeptFilter] = useState('all')
  const [selectedPendingIds, setSelectedPendingIds] = useState([])

  const canCreate = can(user, 'billing.create')
  const canEdit = can(user, 'billing.update')
  const canDelete = can(user, 'billing.delete')

  const billTotal = (b) => computeBill({ items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate }).grandTotal

  const totals = useMemo(() => {
    const collected = state.bills.reduce((s, b) => s + (b.paidAmount || 0), 0)
    const billed = state.bills.reduce((s, b) => s + billTotal(b), 0)
    return { collected, billed, dues: billed - collected }
  }, [state.bills])

  const filtered = useMemo(() => {
    return state.bills
      .filter((b) => {
        const matchQ = !query || patientName(b.patientId).toLowerCase().includes(query.toLowerCase()) || b.invoiceNo.toLowerCase().includes(query.toLowerCase())
        const matchS = statusFilter === 'all' || b.status === statusFilter
        const matchT = typeFilter === 'all' || b.billType === typeFilter
        return matchQ && matchS && matchT
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [state.bills, query, statusFilter, typeFilter, patientName])

  const pendingItems = useMemo(() => {
    return (state.billableItems || [])
      .filter((bi) => bi.status === 'pending')
      .filter((bi) => !pendingQuery || patientName(bi.patientId).toLowerCase().includes(pendingQuery.toLowerCase()) || bi.desc.toLowerCase().includes(pendingQuery.toLowerCase()))
      .filter((bi) => pendingDeptFilter === 'all' || bi.department === pendingDeptFilter)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [state.billableItems, pendingQuery, pendingDeptFilter, patientName])

  // Only departments actually present in pending items, not every
  // department in the hospital — same "don't show empty filters" call
  // as the Command Center's department-load table (§12 Phase 9c).
  const pendingDepts = useMemo(
    () => [...new Set((state.billableItems || []).filter((bi) => bi.status === 'pending').map((bi) => bi.department))],
    [state.billableItems]
  )

  const pendingTotal = useMemo(() => pendingItems.reduce((s, bi) => s + (bi.amount || 0), 0), [pendingItems])

  const blankBill = () => ({
    patientId: state.patients[0]?.id || '',
    episodeId: null,
    billType: 'OPD',
    department: state.patients[0]?.department || 'Ayurveda',
    doctorId: '',
    date: today(), status: 'pending', paidAmount: 0, paymentMethod: '',
    discountType: 'none', discountValue: 0, gstRate: 5,
    items: [{ desc: 'Consultation', qty: 1, rate: 0 }],
  })

  const save = () => {
    const d = form.data
    const bd = computeBill({ items: d.items, discountType: d.discountType, discountValue: d.discountValue, gstRate: d.gstRate })
    const paid = d.status === 'paid' ? bd.grandTotal : d.status === 'partial' ? Number(d.paidAmount) || 0 : 0
    const clean = {
      ...d,
      discountValue: Number(d.discountValue) || 0,
      gstRate: Number(d.gstRate) || 0,
      items: d.items.map((i) => ({ desc: i.desc, qty: Number(i.qty) || 1, rate: Number(i.rate) || 0 })),
      total: bd.grandTotal,
      paidAmount: paid,
    }
    if (form.mode === 'add') {
      const invoiceNo = codeNo('INV', state.bills.length + 1)
      // Generated up front (not left to the generic add() reducer to
      // assign) so a bill created from pending billableItems can be
      // cross-referenced on them in the same action — see
      // form.billableItemIds below.
      const billId = uid('bill')
      add('bills', { ...clean, id: billId, invoiceNo })
      if (form.billableItemIds?.length) {
        form.billableItemIds.forEach((biId) => update('billableItems', biId, { status: 'invoiced', billId, invoiceNo }))
      }
      toast(`Invoice ${invoiceNo} generated — ${inr(bd.grandTotal)}.`)
    } else {
      update('bills', d.id, clean)
      toast(`Invoice ${d.invoiceNo} updated.`)
    }
    setForm(null)
    setSelectedPendingIds([])
  }

  // Pending billable items → invoice (task: wire billableItems to Billing).
  // Selection is constrained to one patient at a time — a single invoice
  // can't sensibly bill two different patients' items.
  const togglePendingSelect = (item) => {
    setSelectedPendingIds((ids) => {
      if (ids.includes(item.id)) return ids.filter((id) => id !== item.id)
      const firstSelected = pendingItems.find((bi) => bi.id === ids[0])
      if (firstSelected && firstSelected.patientId !== item.patientId) {
        toast('Select pending items from one patient at a time.', 'error')
        return ids
      }
      return [...ids, item.id]
    })
  }

  const generateFromSelected = (ids) => {
    const items = pendingItems.filter((bi) => ids.includes(bi.id))
    if (items.length === 0) return
    const first = items[0]
    const patient = patientById[first.patientId]
    const sameEpisode = items.every((bi) => bi.episodeId === first.episodeId)
    const episode = sameEpisode && first.episodeId ? state.episodes.find((e) => e.id === first.episodeId) : null
    setForm({
      mode: 'add',
      billableItemIds: ids,
      data: {
        ...blankBill(),
        patientId: first.patientId,
        department: first.department || patient?.department || 'Ayurveda',
        billType: inferBillType(first.department, episode?.type === 'IPD'),
        episodeId: episode?.id || null,
        items: items.map((bi) => ({ desc: bi.desc, qty: 1, rate: bi.amount || 0 })),
      },
    })
  }

  const setStatus = (b, status) => {
    const gt = billTotal(b)
    const paidAmount = status === 'paid' ? gt : status === 'pending' ? 0 : b.paidAmount
    update('bills', b.id, { status, paidAmount })
    toast(`${b.invoiceNo} marked ${status}.`)
  }

  const doPrint = (b, lang) => {
    const patient = patientById[b.patientId]
    const episode = b.episodeId ? state.episodes.find((e) => e.id === b.episodeId) : null
    const ok = printInvoice({ bill: b, patient, episode, doctorName: b.doctorId ? doctorName(b.doctorId) : '', lang })
    if (!ok) toast('Please allow pop-ups to print the invoice.', 'error')
  }

  return (
    <>
      <PageHeader
        title="Billing & Finance"
        subtitle="Invoices with discount, GST, dues and printable formats"
        icon={Receipt}
        actions={canCreate && <button className="btn-primary" onClick={() => setForm({ mode: 'add', data: blankBill() })}><Plus size={18} /> Generate Bill</button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue Collected" value={inr(totals.collected)} icon={IndianRupee} />
        <StatCard label="Total Billed" value={inr(totals.billed)} icon={Wallet} tone="sky" />
        <StatCard label="Pending Dues" value={inr(totals.dues)} icon={Clock} tone="rose" />
      </div>

      {/* Pending billable items — completed procedures/sessions/therapies
          awaiting invoicing (repositories.js pushes these on completion;
          this is the first UI that ever reads state.billableItems). */}
      {pendingItems.length > 0 && (
        <div className="mb-6 card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <FileStack size={16} /> Pending Items ({pendingItems.length}) — {inr(pendingTotal)} awaiting invoice
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput value={pendingQuery} onChange={setPendingQuery} placeholder="Search patient or item…" />
              <Select value={pendingDeptFilter} onChange={(e) => setPendingDeptFilter(e.target.value)} className="w-auto">
                <option value="all">All departments</option>
                {pendingDepts.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
              {canCreate && selectedPendingIds.length > 0 && (
                <button className="btn-primary btn-sm" onClick={() => generateFromSelected(selectedPendingIds)}>
                  <ReceiptText size={14} /> Generate Invoice ({selectedPendingIds.length})
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-cream/60"><tr>
                {canCreate && <th className="th w-8"></th>}
                <th className="th">Patient</th><th className="th">Department</th><th className="th">Item</th>
                <th className="th">Source</th><th className="th text-right">Amount</th><th className="th">Since</th>
                {canCreate && <th className="th text-right">Actions</th>}
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {pendingItems.map((bi) => (
                  <tr key={bi.id} className="hover:bg-cream/40">
                    {canCreate && (
                      <td className="td">
                        <input type="checkbox" checked={selectedPendingIds.includes(bi.id)} onChange={() => togglePendingSelect(bi)} />
                      </td>
                    )}
                    <td className="td">{patientName(bi.patientId)}</td>
                    <td className="td"><Badge tone="slate">{bi.department}</Badge></td>
                    <td className="td font-medium text-brand-900">{bi.desc}</td>
                    <td className="td text-ink/50">{bi.source}</td>
                    <td className="td text-right">{inr(bi.amount || 0)}</td>
                    <td className="td text-ink/50">{formatDate(bi.createdAt)}</td>
                    {canCreate && (
                      <td className="td text-right">
                        <button className="btn-ghost btn-sm text-brand-700" title="Generate invoice for this item" onClick={() => generateFromSelected([bi.id])}>
                          <ReceiptText size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-sand p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search invoice or patient…" />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
            <option value="all">All types</option>
            {BILL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option><option value="partial">Partial</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No invoices" message="Generate a bill to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Invoice</th><th className="th">Type</th><th className="th">Patient</th><th className="th">Department</th>
                <th className="th">Date</th><th className="th text-right">Total</th><th className="th">Status</th><th className="th text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-cream/40">
                    <td className="td font-mono text-xs text-brand-800">{b.invoiceNo}</td>
                    <td className="td"><Badge tone={b.billType === 'IPD' ? 'sky' : b.billType === 'Panchakarma' ? 'green' : 'slate'}>{b.billType}</Badge></td>
                    <td className="td">{patientName(b.patientId)}</td>
                    <td className="td">{b.department}</td>
                    <td className="td text-ink/50">{formatDate(b.date)}</td>
                    <td className="td text-right font-medium">{inr(billTotal(b))}</td>
                    <td className="td">
                      {canEdit ? (
                        <Select value={b.status} onChange={(e) => setStatus(b, e.target.value)} className="w-auto py-1 text-xs">
                          <option value="paid">Paid</option><option value="partial">Partial</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option>
                        </Select>
                      ) : <Badge status={b.status} />}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => setView(b)} title="View"><Eye size={15} /></button>
                        {canEdit && <button className="btn-ghost btn-sm" onClick={() => setForm({ mode: 'edit', data: { ...b, items: b.items.map((i) => ({ ...i })) } })} title="Edit"><Pencil size={15} /></button>}
                        {canDelete && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm(b)} title="Delete"><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <BillForm form={form} setForm={setForm} onSave={save} state={state} patientById={patientById} />}
      {view && <ViewInvoice bill={view} onClose={() => setView(null)} onPrint={doPrint} patient={patientById[view.patientId]} doctorName={doctorName} />}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { remove('bills', confirm.id); toast(`${confirm.invoiceNo} deleted.`, 'info') }}
        title="Delete invoice?"
        message={confirm ? `${confirm.invoiceNo} will be permanently removed.` : ''}
      />
    </>
  )
}

function BillForm({ form, setForm, onSave, state, patientById }) {
  const d = form.data
  const setItems = (items) => setForm({ ...form, data: { ...d, items } })
  const updateItem = (i, key, val) => setItems(d.items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)))
  const bd = computeBill({ items: d.items, discountType: d.discountType, discountValue: d.discountValue, gstRate: d.gstRate })

  // episodes for the chosen patient (to attach OPD/IPD ref)
  const patientEpisodes = state.episodes.filter((e) => e.patientId === d.patientId)

  return (
    <Modal
      open onClose={() => setForm(null)}
      title={form.mode === 'add' ? 'Generate Bill' : 'Edit Invoice'}
      subtitle="Itemised charges with discount & GST"
      size="lg"
      footer={<><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" onClick={onSave}>{form.mode === 'add' ? 'Generate' : 'Save'}</button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Patient">
          <Select value={d.patientId} onChange={(e) => {
            const p = patientById[e.target.value]
            setForm({ ...form, data: { ...d, patientId: e.target.value, department: p?.department || d.department, episodeId: null } })
          }}>
            {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Bill type">
          <Select value={d.billType} onChange={(e) => setForm({ ...form, data: { ...d, billType: e.target.value } })}>
            {BILL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="OPD/IPD reference">
          <Select value={d.episodeId || ''} onChange={(e) => setForm({ ...form, data: { ...d, episodeId: e.target.value || null } })}>
            <option value="">— none —</option>
            {patientEpisodes.map((e) => <option key={e.id} value={e.id}>{e.refNo}</option>)}
          </Select>
        </Field>
        <Field label="Department"><Input value={d.department} onChange={(e) => setForm({ ...form, data: { ...d, department: e.target.value } })} /></Field>
        <Field label="Doctor">
          <Select value={d.doctorId} onChange={(e) => setForm({ ...form, data: { ...d, doctorId: e.target.value } })}>
            <option value="">— none —</option>
            {state.doctors.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
          </Select>
        </Field>
        <Field label="Date"><Input type="date" value={d.date} onChange={(e) => setForm({ ...form, data: { ...d, date: e.target.value } })} /></Field>
      </div>

      {/* line items */}
      <div className="mt-5">
        <p className="label">Line items</p>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-1 text-[10px] uppercase tracking-wide text-ink/40">
            <div className="col-span-6">Description</div><div className="col-span-2">Qty</div><div className="col-span-3">Rate</div><div className="col-span-1"></div>
          </div>
          {d.items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <div className="col-span-6"><Input placeholder="Description" value={it.desc} onChange={(e) => updateItem(i, 'desc', e.target.value)} /></div>
              <div className="col-span-2"><Input type="number" min="1" value={it.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} /></div>
              <div className="col-span-3"><Input type="number" value={it.rate} onChange={(e) => updateItem(i, 'rate', e.target.value)} /></div>
              <div className="col-span-1 flex items-center justify-center">
                {d.items.length > 1 && <button className="text-rose-500 hover:text-rose-700" onClick={() => setItems(d.items.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-ghost btn-sm mt-2" onClick={() => setItems([...d.items, { desc: '', qty: 1, rate: 0 }])}><Plus size={14} /> Add line</button>
      </div>

      {/* discount + gst */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Discount type">
          <Select value={d.discountType} onChange={(e) => setForm({ ...form, data: { ...d, discountType: e.target.value } })}>
            <option value="none">No discount</option><option value="percent">Percentage</option><option value="fixed">Fixed amount</option>
          </Select>
        </Field>
        {d.discountType !== 'none' && (
          <Field label={d.discountType === 'percent' ? 'Discount %' : 'Discount ₹'}>
            <Input type="number" value={d.discountValue} onChange={(e) => setForm({ ...form, data: { ...d, discountValue: e.target.value } })} />
          </Field>
        )}
        <Field label="GST / Tax %"><Input type="number" value={d.gstRate} onChange={(e) => setForm({ ...form, data: { ...d, gstRate: e.target.value } })} /></Field>
      </div>

      {/* payment */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Payment status">
          <Select value={d.status} onChange={(e) => setForm({ ...form, data: { ...d, status: e.target.value } })}>
            <option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        {d.status === 'partial' && (
          <Field label="Amount paid (₹)"><Input type="number" value={d.paidAmount} onChange={(e) => setForm({ ...form, data: { ...d, paidAmount: e.target.value } })} /></Field>
        )}
        <Field label="Payment method">
          <Select value={d.paymentMethod} onChange={(e) => setForm({ ...form, data: { ...d, paymentMethod: e.target.value } })}>
            <option value="">—</option><option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option><option>Insurance</option>
          </Select>
        </Field>
      </div>

      {/* live breakdown */}
      <div className="mt-5 rounded-xl bg-cream/70 p-4 text-sm">
        <Row label="Subtotal" value={inr(bd.subtotal)} />
        {bd.discountAmount > 0 && <Row label={`Discount${d.discountType === 'percent' ? ` (${d.discountValue}%)` : ''}`} value={'− ' + inr(bd.discountAmount)} />}
        {bd.discountAmount > 0 && <Row label="Taxable amount" value={inr(bd.taxable)} />}
        {bd.gstAmount > 0 && <Row label={`GST (${d.gstRate}%)`} value={inr(bd.gstAmount)} />}
        <div className="mt-2 flex items-center justify-between border-t border-sand pt-2">
          <span className="font-semibold text-ink/70">Grand Total</span>
          <span className="font-display text-xl font-semibold text-brand-900">{inr(bd.grandTotal)}</span>
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between py-0.5"><span className="text-ink/50">{label}</span><span className="font-medium text-ink/80">{value}</span></div>
}

function ViewInvoice({ bill, onClose, onPrint, patient, doctorName }) {
  const [lang, setLang] = useState('en')
  const bd = computeBill({ items: bill.items, discountType: bill.discountType, discountValue: bill.discountValue, gstRate: bill.gstRate })
  const balance = bd.grandTotal - (bill.paidAmount || 0)

  return (
    <Modal open onClose={onClose} title={bill.invoiceNo} subtitle={`${patient?.name} · ${bill.billType} · ${formatDate(bill.date)}`}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/50">Print language:</span>
            <Select value={lang} onChange={(e) => setLang(e.target.value)} className="w-auto py-1 text-xs">
              <option value="en">English</option><option value="ar">العربية (RTL)</option><option value="bilingual">Bilingual</option>
            </Select>
          </div>
          <button className="btn-primary" onClick={() => onPrint(bill, lang)}><Printer size={16} /> Print / PDF</button>
        </div>
      }
    >
      <table className="w-full text-sm">
        <thead><tr className="text-[11px] uppercase tracking-wide text-ink/40">
          <th className="py-1 text-left">Description</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Rate</th><th className="py-1 text-right">Amount</th>
        </tr></thead>
        <tbody className="divide-y divide-sand">
          {bill.items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 text-ink/70">{it.desc}</td>
              <td className="py-2 text-right">{it.qty || 1}</td>
              <td className="py-2 text-right">{inr(it.rate ?? it.amount ?? 0)}</td>
              <td className="py-2 text-right font-medium">{inr((it.qty || 1) * (it.rate ?? it.amount ?? 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 space-y-1">
        <Row label="Subtotal" value={inr(bd.subtotal)} />
        {bd.discountAmount > 0 && <Row label="Discount" value={'− ' + inr(bd.discountAmount)} />}
        {bd.discountAmount > 0 && <Row label="Taxable amount" value={inr(bd.taxable)} />}
        {bd.gstAmount > 0 && <Row label={`GST (${bill.gstRate}%)`} value={inr(bd.gstAmount)} />}
        <div className="flex items-center justify-between border-t border-sand pt-2 font-semibold text-brand-900"><span>Grand Total</span><span>{inr(bd.grandTotal)}</span></div>
        <Row label="Paid" value={inr(bill.paidAmount || 0)} />
        <Row label="Balance due" value={inr(balance)} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Badge status={bill.status} />
        {bill.paymentMethod && <span className="text-xs text-ink/50">via {bill.paymentMethod}</span>}
      </div>
    </Modal>
  )
}
