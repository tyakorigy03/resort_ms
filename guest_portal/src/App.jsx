import { Routes, Route, Navigate } from 'react-router-dom'
import QRScan from './pages/QRScan'
import OTPVerify from './pages/OTPVerify'
import GuestDashboard from './pages/GuestDashboard'
import MenuBrowser from './pages/MenuBrowser'
import { getGuestSession } from './api'

export default function App({ mode, onToggleMode }) {
  const session = getGuestSession()

  return (
    <Routes>
      <Route path="/" element={<QRScan onToggleMode={onToggleMode} mode={mode} />} />
      <Route path="/verify" element={<OTPVerify onToggleMode={onToggleMode} mode={mode} />} />
      <Route path="/dashboard" element={<GuestDashboard onToggleMode={onToggleMode} mode={mode} />} />
      <Route path="/menu" element={<MenuBrowser onToggleMode={onToggleMode} mode={mode} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
