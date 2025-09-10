import { useMemo, useState } from 'react'
import { UserContext } from './UserContext'
import axios from 'axios'

export default function UserProvider({ children }) {
  const userFromStorage = sessionStorage.getItem('user')
  const [user, setUser] = useState(
    userFromStorage ? JSON.parse(userFromStorage) : { email: '', password: '' }
  )

  const signUp = async () => {
    const headers = { headers: { 'Content-Type': 'application/json' } }
    await axios.post(
      `${import.meta.env.VITE_API_URL}/user/signup`,
      JSON.stringify({ user }),
      headers
    )
    setUser({ email: '', password: '' })
  }

  const signIn = async (email, password) => {
    const headers = { headers: { 'Content-Type': 'application/json' } }
    const body = JSON.stringify({ user: { email, password } })
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/user/signin`,
      body,
      headers
    )
    setUser(response.data)
    sessionStorage.setItem('user', JSON.stringify(response.data))
  }

  const logout = () => {
    sessionStorage.removeItem('user')
    setUser({ email: '', password: '' })
  }

  const isAuthenticated = useMemo(() => {
    return !!(user && user.token)
  }, [user])

  return (
    <UserContext.Provider value={{ user, setUser, signUp, signIn, logout, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  )
}
