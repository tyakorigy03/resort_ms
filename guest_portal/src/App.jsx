import { Routes, Route, Navigate } from 'react-router-dom'
import QRScan from './pages/QRScan'
import OTPVerify from './pages/OTPVerify'
import GuestLayout from './pages/GuestLayout'
import Home from './pages/Home'
import Bill from './pages/Bill'
import Services from './pages/Services'
import MenuBrowser from './pages/MenuBrowser'

export default function App({ mode, onToggleMode }) {
  return (
    <Routes>
      <Route path="/" element={<QRScan onToggleMode={onToggleMode} mode={mode} />} />
      <Route path="/verify" element={<OTPVerify onToggleMode={onToggleMode} mode={mode} />} />
      <Route element={<GuestLayout onToggleMode={onToggleMode} mode={mode} />}>
        <Route path="/home" element={<Home />} />
        <Route path="/bill" element={<Bill />} />
        <Route path="/navigate" element={<Services />} />
        <Route path="/menu" element={<MenuBrowser onToggleMode={onToggleMode} mode={mode} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
