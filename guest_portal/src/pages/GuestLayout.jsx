import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Box, BottomNavigation, BottomNavigationAction, AppBar, Toolbar, Typography, IconButton, Paper } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ExploreIcon from '@mui/icons-material/Explore'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import logo from '../assets/logo.png'
import { getGuestSession } from '../api'

const navItems = [
  { label: 'Home', icon: <HomeIcon />, path: '/home' },
  { label: 'Navigate', icon: <ExploreIcon />, path: '/navigate', center: true },
  { label: 'Bill', icon: <ReceiptLongIcon />, path: '/bill' },
]

const childRoutes = {
  '/menu': { back: '/navigate', title: 'Room Service' },
}

export default function GuestLayout({ onToggleMode, mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getGuestSession()
  const [value, setValue] = useState(0)

  const isMain = navItems.some((n) => location.pathname === n.path)
  const child = childRoutes[location.pathname]

  useEffect(() => {
    if (!session?.reservationId || !session?.verified) {
      navigate('/')
    }
  }, [])

  useEffect(() => {
    const idx = navItems.findIndex((n) => location.pathname.startsWith(n.path))
    if (idx >= 0) setValue(idx)
  }, [location.pathname])

  function handleChange(_, newValue) {
    setValue(newValue)
    navigate(navItems[newValue].path)
  }

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          {child ? (
            <>
              <IconButton onClick={() => navigate(child.back)} size="small" sx={{ mr: 1 }}>
                <ArrowBackIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {child.title}
              </Typography>
            </>
          ) : (
            <>
              <Box component="img" src={logo} alt="Logo" sx={{ width: 30, height: 30, objectFit: 'contain' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, ml: 1 }}>
                Guest Portal
              </Typography>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={onToggleMode} size="small" title={mode === 'dark' ? 'Light mode' : 'Switch to dark'}>
            {mode === 'dark' ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', pb: isMain ? '68px' : 0 }}>
        <Outlet />
      </Box>

      {isMain && (
        <Paper
          elevation={3}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
        >
          <BottomNavigation
            value={value}
            onChange={handleChange}
            showLabels
            sx={{
              height: 64,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                py: 1,
                '&.Mui-selected': { color: 'primary.main' },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.62rem',
                mt: 0.25,
                '&.Mui-selected': { fontSize: '0.62rem' },
              },
            }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={
                  item.center ? (
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: -2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        '& svg': { color: '#fff' },
                      }}
                    >
                      {item.icon}
                    </Box>
                  ) : (
                    item.icon
                  )
                }
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
