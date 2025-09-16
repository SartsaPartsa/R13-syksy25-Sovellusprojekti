
import { useEffect, useMemo, useState } from 'react'
import { UserContext } from './UserContext'

export default function UserProvider({ children }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [authUser, setAuthUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('auth'))
      if (a?.user && a?.token) {
        setAuthUser(a.user)
        setToken(a.token)
      }
    } catch {}
  }, [])

  async function signIn(email, password) {
    const res = await fetch('/api/user/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password } }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Login failed')

    const auth = { user: { id: data.id, email: data.email }, token: data.token }
    localStorage.setItem('auth', JSON.stringify(auth))
    setAuthUser(auth.user)
    setToken(auth.token)
    return auth
  }

  async function signUp() {
    const { email, password } = form
    const res = await fetch('/api/user/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password } }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Signup failed')
    return data
  }

  
  function signOut() {
    try { localStorage.removeItem('auth') } catch {}
    setAuthUser(null)
    setToken(null)
    setForm({ email: '', password: '' })
  }

  const isAuthenticated = useMemo(() => {
    if (token) return true
    try { return Boolean(JSON.parse(localStorage.getItem('auth'))?.token) } catch { return false }
  }, [token])

  return (
    <UserContext.Provider
      value={{
        user: form,
        setUser: setForm,
        authUser,
        token,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        logout: signOut,    // ← на всякий случай алиас
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
