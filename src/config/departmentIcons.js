// Named imports only — a namespace import (`import * as Icons`) pulls the
// entire lucide-react icon set into the bundle since a dynamic property
// lookup defeats tree-shaking. This map covers every icon name currently
// used by a seeded department (src/data/seed.js), plus the Building2
// fallback ensureCollections' migration uses for unrecognised departments.
import { Leaf, Stethoscope, Smile, Activity, HandHeart, Ear, PersonStanding, Sparkles, Apple, FlaskConical, Flower2, Building2 } from 'lucide-react'

const DEPARTMENT_ICONS = {
  Leaf, Stethoscope, Smile, Activity, HandHeart, Ear, PersonStanding, Sparkles, Apple, FlaskConical, Flower2, Building2,
}

export function departmentIcon(name) {
  return DEPARTMENT_ICONS[name] || Building2
}
