import { useState, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getDevice, getToken, clearSession } from './api'
import Login from './Login'
import Welcome from './Welcome'
import ClockInOut from './ClockInOut'
import PosShell from './PosShell'
import TablesScreen from './TablesScreen'
import Console from './Console'
import OrdersScreen from './OrdersScreen'
import CustomersScreen from './CustomersScreen'
import ReceiptsScreen from './ReceiptsScreen'
import SettingsScreen from './SettingsScreen'

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

  function AuthShell({ children }) {
    return (
      <RequireAuth authed={authed}>
        <PosShell device={device} onLogout={logout}>
          {children}
        </PosShell>
      </RequireAuth>
    )
  }

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
            <Welcome device={device} />
          </RequireAuth>
        }
      />
      <Route
        path="/clock"
        element={
          <RequireAuth authed={authed}>
            <ClockInOut onBack={() => navigate('/')} onClockedIn={() => navigate('/tables')} />
          </RequireAuth>
        }
      />
      <Route path="/register" element={<AuthShell><Console /></AuthShell>} />
      <Route path="/tables" element={<AuthShell><TablesScreen /></AuthShell>} />
      <Route path="/orders" element={<AuthShell><OrdersScreen /></AuthShell>} />
      <Route path="/customers" element={<AuthShell><CustomersScreen /></AuthShell>} />
      <Route path="/receipts" element={<AuthShell><ReceiptsScreen /></AuthShell>} />
      <Route path="/settings" element={<AuthShell><SettingsScreen /></AuthShell>} />
      <Route path="*" element={<Navigate to={authed ? '/' : '/login'} replace />} />
    </Routes>
  )
}
