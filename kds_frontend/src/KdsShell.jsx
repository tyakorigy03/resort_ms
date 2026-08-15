import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LockIcon from '@mui/icons-material/Lock'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import SettingsIcon from '@mui/icons-material/Settings'
import { api } from './api'
import { useThemeMode } from './ThemeModeProvider'
import SettingsDrawer from './components/SettingsDrawer'

const KdsContext = createContext(null)

export function useKds() {
  return useContext(KdsContext)
}

export default function KdsShell({ device, onLogout, children }) {
  const [settings, setSettings] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clock, setClock] = useState(new Date())
  const { setModeTo } = useThemeMode()
  const navigate = useNavigate()

  async function loadSettings() {
    try {
      const s = await api.kdsSettings()
      setSettings(s)
      if (s.colorTheme === 'dark' || s.colorTheme === 'light') setModeTo(s.colorTheme)
      return s
    } catch {
      return null
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function updateSettings(patch) {
    const next = { ...settings, ...patch }
    if (patch.layouts) next.layouts = { ...settings?.layouts, ...patch.layouts }
    if (patch.waitTimes) next.waitTimes = { ...settings?.waitTimes, ...patch.waitTimes }
    setSettings(next)
    if (patch.colorTheme) setModeTo(patch.colorTheme)
    try {
      const saved = await api.updateKdsSettings(patch)
      setSettings(saved)
      if (saved.colorTheme === 'dark' || saved.colorTheme === 'light') setModeTo(saved.colorTheme)
    } catch {
      /* keep local value; saved on next change */
    }
  }

  const value = useMemo(() => ({ device, settings, updateSettings }), [device, settings])

  return (
    <KdsContext.Provider value={value}>
      <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: 'topBar' }}>
          <Toolbar sx={{ gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 38, height: 38 }}>
              <RestaurantMenuIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2, fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {device?.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.2, display: 'block' }}>
                {device?.productionCenterName || device?.outletName || 'Kitchen Display'}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Chip icon={<AccessTimeIcon sx={{ fontSize: 16 }} />} label={clock.toLocaleTimeString()} size="small" />

            <IconButton color="inherit" size="small" onClick={() => setSettingsOpen(true)} title="Quick display settings">
              <SettingsIcon fontSize="small" />
            </IconButton>
            <IconButton color="inherit" size="small" onClick={() => navigate('/settings')} title="Full display settings">
              <OpenInFullIcon fontSize="small" />
            </IconButton>
            <IconButton color="inherit" size="small" onClick={onLogout} title="Lock">
              <LockIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onChange={updateSettings}
        />
      </Box>
    </KdsContext.Provider>
  )
}
