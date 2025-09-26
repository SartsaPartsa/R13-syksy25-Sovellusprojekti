
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { UserContext } from './UserContext'
export { useUser } from './useUser'

export default function UserProvider({ children }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [authUser, setAuthUser] = useState(null)
  const [token, setToken] = useState(null)
  const [favorites, setFavorites] = useState(new Set())

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('auth'))
      if (a?.user && a?.token) {
        setAuthUser(a.user)
        setToken(a.token)
      }
    } catch { }
  }, [])
  // Load auth from localStorage on mount and set state if present

  // Sign in: authenticate, store auth in localStorage and load favorites
  async function signIn(email, password) {
    const data = await api('/api/user/signin', {
      method: 'POST',
      body: JSON.stringify({ user: { email, password } }),
    })

    const auth = { user: { id: data.id, email: data.email }, token: data.token }
    localStorage.setItem('auth', JSON.stringify(auth))
    setAuthUser(auth.user)
    setToken(auth.token)

    // Load user's favorites
    const favData = await api(`/api/favorites/${data.id}`).catch(() => [])
    setFavorites(new Set((favData || []).map(f => f.movie_id)))

    return auth
  }

  // Create a new user using values in `form`
  async function signUp() {
    const { email, password } = form
    return api('/api/user/signup', {
      method: 'POST',
      body: JSON.stringify({ user: { email, password } }),
    })
  }


  // Sign out and clear stored auth/favorites
  function signOut() {
    try { localStorage.removeItem('auth') } catch { }
    setFavorites(new Set())
    setAuthUser(null)
    setToken(null)
    setForm({ email: '', password: '' })
  }

  // Quick memoized auth check (token in state or localStorage)
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
        logout: signOut,
        favorites,
        setFavorites
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
