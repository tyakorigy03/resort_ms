import { useEffect, useState } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import EventNoteIcon from '@mui/icons-material/EventNote'
import HotelIcon from '@mui/icons-material/Hotel'
import LightModeIcon from '@mui/icons-material/LightMode'
import LockIcon from '@mui/icons-material/Lock'
import { useThemeMode } from './ThemeModeProvider'
import { useAuth } from './AuthProvider'
import NavButton from './components/NavButton'

export default function FrontDeskShell({ children }) {
  const { user, logout } = useAuth()
  const [clock, setClock] = useState(new Date())
  const { toggleMode } = useThemeMode()
  const theme = useTheme()

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: 'topBar' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 38, height: 38 }}>
            <HotelIcon fontSize="small" />
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 2 }}>
            Front Desk
          </Typography>

          <NavButton to="/" icon={<DashboardIcon fontSize="small" />} label="Stays" end />
          <NavButton to="/reservations" icon={<EventNoteIcon fontSize="small" />} label="Reservations" />

          <Box sx={{ flexGrow: 1 }} />

          <Chip
            label={clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            size="small"
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {user?.name}
          </Typography>
          <IconButton
            color="inherit"
            size="small"
            onClick={toggleMode}
            title={theme.palette.mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme.palette.mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
          <IconButton color="inherit" size="small" onClick={logout} title="Sign out">
            <LockIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}
