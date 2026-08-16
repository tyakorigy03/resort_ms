import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import Login from './Login'
import FrontDeskShell from './FrontDeskShell'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Rack from './pages/Rack'
import ReservationDetail from './pages/ReservationDetail'
import Folio from './pages/Folio'

export default function App() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    )
  }

  return (
    <FrontDeskShell>
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
