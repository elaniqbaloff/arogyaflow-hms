import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { users as seedUsers } from '../data/seed'

const AUTH_KEY = 'palikutty-hms-auth-v1'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_KEY)
  }, [user])

  const login = (email, password) => {
    const found = seedUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    )
    if (!found) return { ok: false, error: 'No account found for that email.' }
    if (found.status === 'disabled')
      return { ok: false, error: 'This account has been disabled.' }
    if (found.password !== password)
      return { ok: false, error: 'Incorrect password.' }
    const safe = { id: found.id, name: found.name, email: found.email, role: found.role, department: found.department }
    setUser(safe)
    return { ok: true, user: safe }
  }

  const logout = () => setUser(null)

  const value = useMemo(() => ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
