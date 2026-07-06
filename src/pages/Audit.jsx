import { useMemo, useState } from 'react'
import { ScrollText, Download, Filter } from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { roleLabel } from '../config/roles'
import { PageHeader, StatCard, Badge, Select, Input, EmptyState } from '../components/ui/primitives'
import { exportCsv } from '../lib/csv'
import { formatDate } from '../lib/utils'

const SEV_TONE = { info: 'slate', notice: 'sky', warning: 'gold', critical: 'rose' }

export default function Audit() {
  const { state } = useHospital()
  const { user } = useAuth()
  const [module, setModule] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [query, setQuery] = useState('')

  const entries = useMemo(() => {
    let list = [...(state.audit || [])].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    // Finance sees finance-related audit; admin/management/it see all.
    if (user.role === 'finance') list = list.filter((e) => ['billing', 'approvals', 'pricing'].includes(e.module))
    if (module !== 'all') list = list.filter((e) => e.module === module)
    if (severity !== 'all') list = list.filter((e) => e.severity === severity)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((e) => (e.action || '').toLowerCase().includes(q) || (e.user || '').toLowerCase().includes(q) || (e.mrn || '').toLowerCase().includes(q))
    }
    return list
  }, [state.audit, module, severity, query, user.role])

  const modules = useMemo(() => Array.from(new Set((state.audit || []).map((e) => e.module))).sort(), [state.audit])

  const doExport = () => exportCsv('audit_log', [
    { label: 'Timestamp', value: 'at' }, { label: 'User', value: 'user' }, { label: 'Role', value: (e) => roleLabel(e.role) },
    { label: 'Action', value: 'action' }, { label: 'Module', value: 'module' }, { label: 'Record', value: 'recordId' },
    { label: 'MRN', value: 'mrn' }, { label: 'Old', value: 'oldValue' }, { label: 'New', value: 'newValue' },
    { label: 'Severity', value: 'severity' }, { label: 'Remarks', value: 'remarks' },
  ], entries)

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Sensitive events across the platform" icon={ScrollText}
        actions={<button className="btn-outline" onClick={doExport}><Download size={16} /> Export CSV</button>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Events" value={(state.audit || []).length} icon={ScrollText} />
        <StatCard label="Warnings" value={(state.audit || []).filter((e) => e.severity === 'warning').length} icon={ScrollText} tone="gold" />
        <StatCard label="Critical" value={(state.audit || []).filter((e) => e.severity === 'critical').length} icon={ScrollText} tone="rose" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-sand p-4">
          <Filter size={16} className="text-ink/30" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action, user, MRN…" className="w-56" />
          <Select value={module} onChange={(e) => setModule(e.target.value)} className="w-auto">
            <option value="all">All modules</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-auto">
            <option value="all">All severities</option>
            <option value="info">Info</option><option value="notice">Notice</option><option value="warning">Warning</option><option value="critical">Critical</option>
          </Select>
        </div>

        {entries.length === 0 ? (
          <EmptyState title="No audit entries" message="Events will appear here as users act in the system." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Time</th><th className="th">User</th><th className="th">Action</th>
                <th className="th">Module</th><th className="th">MRN</th><th className="th">Change</th><th className="th">Severity</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-cream/40">
                    <td className="td whitespace-nowrap text-ink/50">{formatDate(e.at)}</td>
                    <td className="td"><p className="text-sm font-medium text-brand-900">{e.user}</p><p className="text-xs text-ink/40">{roleLabel(e.role)}</p></td>
                    <td className="td font-mono text-xs text-ink/70">{e.action}</td>
                    <td className="td capitalize">{e.module}</td>
                    <td className="td font-mono text-xs text-ink/60">{e.mrn || '—'}</td>
                    <td className="td text-xs text-ink/50">{e.oldValue != null || e.newValue != null ? `${e.oldValue ?? '—'} → ${e.newValue ?? '—'}` : '—'}</td>
                    <td className="td"><Badge tone={SEV_TONE[e.severity]}>{e.severity}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
