import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import LockIcon from '@mui/icons-material/Lock'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { api } from './api'
import { useShell } from './PosShell'
import { useThemeMode } from './ThemeModeProvider'
import { money } from './format'

export default function SettingsScreen() {
  const { device, period, myShift, today, openClock, openPeriod, logout } = useShell()
  const { mode, toggleMode } = useThemeMode()
  const [drawerMsg, setDrawerMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function openDrawer() {
    if (busy) return
    setBusy(true)
    setDrawerMsg(null)
    try {
      await api.drawerOpen()
      setDrawerMsg({ severity: 'success', text: 'Drawer opened (No sale).' })
    } catch (err) {
      setDrawerMsg({ severity: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 560 }}>
      {drawerMsg && (
        <Alert
          severity={drawerMsg.severity}
          sx={{ fontSize: '0.85rem' }}
          action={
            <IconButton size="small" onClick={() => setDrawerMsg(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {drawerMsg.text}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          This device
        </Typography>
        <Row label="Name" value={device?.name} />
        <Row label="Code" value={device?.code} />
        <Row label="Type" value={device?.deviceType} />
        <Row label="Outlet" value={device?.outletName} />
        <Row label="Production center" value={device?.productionCenterName} />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          Today at this outlet
        </Typography>
        <Row label="Sales period" value={period ? `Open since ${fmt(period.openedAt)}` : 'Closed'} />
        <Row label="My shift" value={myShift ? `${myShift.staffName} (clocked in)` : 'Not clocked in'} />
        <Row label="Orders" value={`${today.count}`} />
        <Row label="Sales total" value={money(today.total)} />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          Actions
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<PointOfSaleIcon />}
            onClick={openDrawer}
            disabled={busy}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            Open drawer (No sale)
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<AccessTimeIcon />}
            onClick={openClock}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            Staff clock in / out
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<StorefrontIcon />}
            onClick={openPeriod}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            Sales period
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            onClick={toggleMode}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            Theme: {mode}
          </Button>
        </Box>
      </Paper>

      <Divider />

      <Button
        variant="contained"
        color="warning"
        startIcon={<LockIcon />}
        onClick={logout}
        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
      >
        Lock this register
      </Button>
    </Box>
  )
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

function fmt(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
