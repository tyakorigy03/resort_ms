import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PersonIcon from '@mui/icons-material/Person'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
import { iReportsNav } from '../navigation/iReportsNav.jsx'
import './MainLayout.css'

function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(true)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const close = () => setMobileOpen(false)

  return (
    <div className={`layout${railOpen ? ' expanded' : ''}`}>
      <aside className={`sidebar-rail${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="rail-header">
          <img src={logo} alt="iReports" className="rail-logo" />
          <span className="brand-text">iReports</span>
        </div>
        <nav className="rail-nav">
          {iReportsNav.map((item) => {
            if (item.divider) {
              return <div key={`div-${item.id}`} className="rail-divider" />
            }
            if (item.caption) {
              return (
                <div key={item.id} className="rail-caption">
                  {item.label}
                </div>
              )
            }
            const isActive = pathname === item.to
            return (
              <NavLink
                key={item.id}
                to={item.to}
                onClick={close}
                className={`rail-item${isActive ? ' active' : ''}${item.child ? ' rail-child' : ''}`}
                title={item.label}
              >
                <span className="rail-icon">{item.icon}</span>
                <span className="rail-label">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="rail-footer">
          <div className="user-chip">
            <span className="avatar">
              <PersonIcon />
            </span>
            <span className="user-chip-name">{user?.name ?? 'User'}</span>
          </div>
          <button className="header-btn sidebar-logout" title="Sign out" onClick={handleLogout}>
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <button
        className="rail-toggle"
        title={railOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={() => setRailOpen((open) => !open)}
      >
        {railOpen ? <ChevronLeftIcon className="rail-toggle-icon" /> : <ChevronRightIcon className="rail-toggle-icon" />}
      </button>

      <div className="main">
        <header className="header">
          <div className="header-left">
            <button className="header-btn mobile-menu-btn" title="Open menu" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </button>
            <button className="header-btn mobile-close-btn" title="Close menu" onClick={close}>
              <CloseIcon />
            </button>
            <div className="header-brand">
              <span className="brand-text">iReports</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="header-btn" title="Help">
              <HelpOutlineOutlinedIcon />
            </button>
            <button className="header-btn" title="Notifications">
              <NotificationsIcon />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {mobileOpen && <div className="sidebar-backdrop" onClick={close} />}
    </div>
  )
}

export default MainLayout
