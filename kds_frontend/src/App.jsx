import { useState, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getDevice, getToken, clearSession } from './api'
import Login from './Login'
import KdsShell from './KdsShell'
import Board from './Board'
import SettingsPage from './SettingsPage'

function RequireAuth({ authed, children }) {
  if (!authed) return <Navigate to="/login" replace />
  return children
}

function RedirectIfAuthed({ authed, children }) {
  if (authed) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [device, setDevice] = useState(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setDevice(getDevice())
    setAuthed(Boolean(getToken()))
    setReady(true)
  }, [])

  function onAuth(session) {
    setDevice(session.device)
    setAuthed(true)
    navigate('/', { replace: true })
  }

  function logout() {
    clearSession()
    setAuthed(false)
    navigate('/login', { replace: true })
  }

  if (!ready) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed authed={authed}>
            <Login onAuth={onAuth} />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth authed={authed}>
            <KdsShell device={device} onLogout={logout}>
              <Board />
            </KdsShell>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth authed={authed}>
            <KdsShell device={device} onLogout={logout}>
              <SettingsPage />
            </KdsShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={authed ? '/' : '/login'} replace />} />
    </Routes>
  )
}
