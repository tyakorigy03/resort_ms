import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { getUser, clearSession } from './api'
import Login from './Login'
import FrontDeskShell from './FrontDeskShell'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Rack from './pages/Rack'
import ReservationDetail from './pages/ReservationDetail'
import Folio from './pages/Folio'

export default function App() {
  const [user, setUser] = useState(getUser())
  const location = useLocation()

  if (!user) {
    return <Login onAuth={(session) => setUser(session.user)} />
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  return (
    <FrontDeskShell user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/reservations/new" element={<Reservations newBooking />} />
        <Route path="/rack" element={<Rack />} />
        <Route path="/reservations/:id" element={<ReservationDetail />} />
        <Route path="/folios/:id" element={<Folio />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace state={{ from: location }} />} />
      </Routes>
    </FrontDeskShell>
  )
}
