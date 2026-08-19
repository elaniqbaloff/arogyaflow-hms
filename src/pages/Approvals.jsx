import { useMemo, useState } from 'react'
import { CheckSquare, Check, X, Clock, Eye } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { roleLabel } from '../config/roles'
import { canApprove, APPROVAL_TYPES } from '../services/workflow'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { PageHeader, StatCard, Badge, Field, Textarea, Select, EmptyState } from '../components/ui/primitives'
import { APPROVAL_STATUS_TONES } from '../config/statusTones'
import { inr, formatDate } from '../lib/utils'

export default function Approvals() {
  const { state, decideApproval, logAudit } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('Pending')
  const [decision, setDecision] = useState(null) // { approval, action }

  const mayApprove = canApprove(user.role)

  const list = useMemo(() => {
    const all = state.approvals || []
    const filtered = tab === 'all' ? all : all.filter((a) => a.status === tab)
    return [...filtered].sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''))
  }, [state.approvals, tab])

  const counts = useMemo(() => {
    const all = state.approvals || []
    return {
      pending: all.filter((a) => a.status === 'Pending').length,
      approved: all.filter((a) => a.status === 'Approved').length,
      rejected: all.filter((a) => a.status === 'Rejected').length,
    }
  }, [state.approvals])

  const submitDecision = (remarks) => {
    const { approval, action } = decision
    // Guard: cannot approve your own request.
    if (approval.requestedBy === user.name) {
      toast('You cannot decide your own request.', 'error'); setDecision(null); return
    }
    decideApproval(approval.id, action, user.name, user.role, remarks)
    logAudit({
      user, action: action === 'Approved' ? 'approval.approved' : 'approval.rejected',
      module: 'approvals', recordId: approval.id, mrn: approval.mrn,
      oldValue: 'Pending', newValue: action, remarks, severity: 'notice',
    })
    toast(`Request ${action.toLowerCase()}.`)
    setDecision(null)
  }

  return (
    <>
      <PageHeader title="Approval Center" subtitle="Discounts, waivers, price changes & clearances" icon={CheckSquare} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={counts.pending} icon={Clock} tone="gold" />
        <StatCard label="Approved" value={counts.approved} icon={Check} tone="brand" />
        <StatCard label="Rejected" value={counts.rejected} icon={X} tone="rose" />
      </div>

      {!mayApprove && (
        <p className="mb-4 rounded-lg bg-cream/70 px-4 py-3 text-sm text-ink/60">
          You can submit and track approval requests here. Only Administrator, Management and Finance can approve or reject.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-sand p-3">
          {['Pending', 'Approved', 'Rejected', 'all'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${tab === t ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>
              {t}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState title="No requests" message="Nothing to review in this view." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Type</th><th className="th">MRN</th><th className="th text-right">Amount</th>
                <th className="th">Requested by</th><th className="th">Reason</th><th className="th">Status</th><th className="th text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/40">
                    <td className="td font-medium text-brand-900">{a.typeLabel}</td>
                    <td className="td font-mono text-xs text-ink/60">{a.mrn || '—'}</td>
                    <td className="td text-right">{a.amount != null ? inr(a.amount) : '—'}</td>
                    <td className="td">
                      <p className="text-sm">{a.requestedBy}</p>
                      <p className="text-xs text-ink/40">{roleLabel(a.requestedRole)} · {formatDate(a.requestedAt)}</p>
                    </td>
                    <td className="td max-w-[220px] text-sm text-ink/60"><span className="block truncate">{a.reason}</span></td>
                    <td className="td">
                      <Badge tone={APPROVAL_STATUS_TONES[a.status]}>{a.status}</Badge>
                      {a.status !== 'Pending' && a.decidedBy && <p className="mt-1 text-[11px] text-ink/40">by {a.decidedBy}</p>}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {mayApprove && a.status === 'Pending' ? (
                          <>
                            <button className="btn-ghost btn-sm text-brand-700" title="Approve" onClick={() => setDecision({ approval: a, action: 'Approved' })}><Check size={15} /></button>
                            <button className="btn-ghost btn-sm text-rose-600" title="Reject" onClick={() => setDecision({ approval: a, action: 'Rejected' })}><X size={15} /></button>
                          </>
                        ) : (
                          a.remarks ? <span className="text-xs text-ink/40 italic">“{a.remarks}”</span> : <span className="text-ink/30">—</span>
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

      {decision && <DecisionModal decision={decision} onClose={() => setDecision(null)} onSubmit={submitDecision} />}
    </>
  )
}

function DecisionModal({ decision, onClose, onSubmit }) {
  const [remarks, setRemarks] = useState('')
  const { approval, action } = decision
  return (
    <Modal open onClose={onClose} title={`${action === 'Approved' ? 'Approve' : 'Reject'} request`}
      subtitle={`${approval.typeLabel}${approval.amount != null ? ' · ' + inr(approval.amount) : ''}`}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className={action === 'Approved' ? 'btn-primary' : 'btn-danger'} onClick={() => onSubmit(remarks)}>{action === 'Approved' ? 'Approve' : 'Reject'}</button></>}>
      <div className="space-y-3">
        <div className="rounded-lg bg-cream/60 p-3 text-sm">
          <p className="text-ink/60">Requested by <span className="font-medium text-ink/80">{approval.requestedBy}</span></p>
          <p className="mt-1 text-ink/60">Reason: {approval.reason || '—'}</p>
        </div>
        <Field label="Remarks (recorded in audit log)"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note explaining the decision…" /></Field>
      </div>
    </Modal>
  )
}
