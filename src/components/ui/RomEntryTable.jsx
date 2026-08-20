import { Plus, Trash2 } from 'lucide-react'
import { Select, Input } from './primitives'
import { SmartField } from './SmartField'
import { uid } from '../../lib/utils'

const JOINTS = ['Cervical Spine', 'Shoulder', 'Elbow', 'Wrist', 'Lumbar Spine', 'Hip', 'Knee', 'Ankle']
const SIDES = ['Left', 'Right', 'Bilateral', 'N/A']

// Repeatable row editor for ROM entries (§10.2 Objective: `[{joint,
// movement, degrees, side}]`) — same add/remove row pattern as the
// Consultations.jsx prescription-item rows. Movement is a SmartField
// (§10.11) bound to physio-term's movement-name entries; departmentCode/
// recordId are optional passthroughs for that suggestion ranking.
export function RomEntryTable({ value = [], onChange, departmentCode, recordId }) {
  const addRow = () => onChange([...value, { id: uid('rom'), joint: JOINTS[0], movement: '', degrees: '', side: 'Bilateral' }])
  const removeRow = (id) => onChange(value.filter((r) => r.id !== id))
  const updateRow = (id, key, val) => onChange(value.map((r) => (r.id === id ? { ...r, [key]: val } : r)))

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-1.5 grid grid-cols-12 gap-2 px-1 text-[10px] uppercase tracking-wide text-ink/40">
          <div className="col-span-3">Joint</div>
          <div className="col-span-4">Movement</div>
          <div className="col-span-2">Degrees</div>
          <div className="col-span-2">Side</div>
          <div className="col-span-1"></div>
        </div>
      )}
      <div className="space-y-2">
        {value.map((row) => (
          <div key={row.id} className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <Select value={row.joint} onChange={(e) => updateRow(row.id, 'joint', e.target.value)}>
                {JOINTS.map((j) => <option key={j} value={j}>{j}</option>)}
              </Select>
            </div>
            <div className="col-span-4">
              <SmartField
                fieldKey="romMovement" departmentCode={departmentCode} recordId={recordId}
                value={row.movement} onChange={(e) => updateRow(row.id, 'movement', e.target.value)}
                placeholder="e.g. Flexion"
              />
            </div>
            <div className="col-span-2">
              <Input type="number" placeholder="°" value={row.degrees} onChange={(e) => updateRow(row.id, 'degrees', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Select value={row.side} onChange={(e) => updateRow(row.id, 'side', e.target.value)}>
                {SIDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="col-span-1 flex items-center justify-center">
              <button type="button" className="text-rose-500 hover:text-rose-700" onClick={() => removeRow(row.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost btn-sm mt-2" onClick={addRow}><Plus size={14} /> Add ROM entry</button>
    </div>
  )
}
