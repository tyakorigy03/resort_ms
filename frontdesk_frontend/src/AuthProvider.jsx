import { createContext, useContext, useMemo, useState } from 'react'
import { api, clearSession, getUser, saveSession } from './api'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser)

  async function login(email, password) {
    const session = await api.login(email, password)
    saveSession({ token: session.token, user: session.user })
    setUser(session.user)
    return session.user
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
