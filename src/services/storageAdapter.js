// ─────────────────────────────────────────────────────────────
// Storage adapter — the ONE place that talks to a persistence
// backend. Swap this out (for a REST/Supabase/Firebase adapter)
// without touching repositories or UI.
//
// Contract an adapter must implement:
//   read()            -> full state object (or null if none)
//   write(state)      -> void   (persist whole state)
//   key               -> string (storage identifier, for tooling)
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'arogyaflow-state-v3'

export const localStorageAdapter = {
  key: STORAGE_KEY,
  read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      console.warn('[storage] read failed', e)
      return null
    }
  },
  write(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('[storage] write failed', e)
    }
  },
  clear() {
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) { /* noop */ }
  },
}

// The active adapter. To go backend-ready later, point this at an
// httpAdapter with the same shape (read/write/clear) and nothing
// else in the app needs to change.
export const adapter = localStorageAdapter

// Legacy keys from earlier versions — used for one-time migration.
export const LEGACY_KEYS = ['palikutty-hms-state-v2', 'palikutty-hms-state-v1']
