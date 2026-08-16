import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import MapIcon from '@mui/icons-material/Map'
import QrCodeIcon from '@mui/icons-material/QrCode'
import logo from './assets/logo.png'
import { api } from './api'
import ClockInDialog from './components/ClockInDialog'

const VIOLET = '#5b3df5'

// Spec 3.1: the welcome screen lists active staff as tappable tiles (with a
// MANAGERS badge), lets you sort them A-Z or by recency, and offers three
// footer actions: clock in/out, view the floor plan, and scan a QR code.
// Browsing the floor plan needs no staff sign-in (only the device token).
export default function Welcome({ device }) {
  const navigate = useNavigate()
  const [staff, setStaff] = useState([])
  const [shifts, setShifts] = useState([])
  const [sort, setSort] = useState('recency')
  const [clockOpen, setClockOpen] = useState(false)
  const [clockTarget, setClockTarget] = useState(null)
  const [qrMode, setQrMode] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setError(null)
    try {
      const [list, active] = await Promise.all([api.staffActive(), api.clockActive()])
      setStaff(list)
      setShifts(active)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const shiftByStaff = useMemo(() => new Map(shifts.map((s) => [s.staffId, s])), [shifts])

  const sorted = useMemo(() => {
    const list = [...staff]
    if (sort === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      list.sort((a, b) => {
        const sa = shiftByStaff.get(a.id)
        const sb = shiftByStaff.get(b.id)
        if (sa && !sb) return -1
        if (sb && !sa) return 1
        if (sa && sb) return new Date(sb.clockedInAt) - new Date(sa.clockedInAt)
        return a.name.localeCompare(b.name)
      })
    }
    return list
  }, [staff, sort, shiftByStaff])

  function enterApp() {
    navigate('/tables')
  }

  function tapStaff(staffMember) {
    if (shiftByStaff.has(staffMember.id)) {
      enterApp()
      return
    }
    setQrMode(false)
    setClockTarget(staffMember.id)
    setClockOpen(true)
  }

  return (
    <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 1.5 }}>
        <Button color="inherit" sx={{ textTransform: 'none', fontWeight: 600, opacity: 0.85 }} onClick={() => setAboutOpen(true)}>
          About
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {device?.name}
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', px: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <img src={logo} alt="Resort MS" style={{ height: 56, width: 'auto' }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Welcome
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Welcome! Tap an active user, view the floor plan or clockin/out.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Sort by:
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sort}
          onChange={(_, v) => v && setSort(v)}
        >
          <ToggleButton value="az">A-Z</ToggleButton>
          <ToggleButton value="recency">Recency</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 1.5, fontSize: '0.85rem' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 3, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : sorted.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No staff members yet. Add staff in the backoffice.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 1.5,
              maxWidth: 980,
              mx: 'auto',
            }}
          >
            {sorted.map((s) => {
              const onShift = shiftByStaff.has(s.id)
              const isManager = isManagerStaff(s)
              return (
                <Button
                  key={s.id}
                  onClick={() => tapStaff(s)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: onShift ? 'success.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                    textTransform: 'none',
                  }}
                >
                  <Avatar sx={{ width: 56, height: 56, bgcolor: onShift ? 'success.main' : 'primary.main', fontSize: 24 }}>
                    {initialOf(s.name)}
                  </Avatar>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {s.name}
                  </Typography>
                  {isManager && (
                    <Chip label="MANAGERS" size="small" sx={{ bgcolor: '#3b5bfe', color: '#fff', fontWeight: 700, fontSize: 10 }} />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ minHeight: 16 }}>
                    {onShift ? 'On shift' : s.position || 'Tap to clock in'}
                  </Typography>
                </Button>
              )
            })}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, px: 3, py: 2, justifyContent: 'center' }}>
        <FooterButton icon={<AccessTimeIcon />} label="Clock in/out" onClick={() => { setQrMode(false); setClockOpen(true) }} />
        <FooterButton icon={<MapIcon />} label="View floor plan" onClick={enterApp} />
        <FooterButton icon={<QrCodeIcon />} label="Scan QR code" onClick={() => { setQrMode(true); setClockOpen(true) }} />
      </Box>

      <ClockInDialog
        key={qrMode ? 'qr' : clockTarget || 'list'}
        open={clockOpen}
        onClose={() => { setClockOpen(false); setQrMode(false); setClockTarget(null) }}
        device={device}
        initialStep={qrMode ? 'qrcode' : undefined}
        initialStaffId={!qrMode ? clockTarget : undefined}
        onChanged={(event) => {
          if (event?.id && !event.clockedOutAt) {
            navigate('/tables')
          }
        }}
      />

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          About Resort MS
          <IconButton onClick={() => setAboutOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <img src={logo} alt="Resort MS" style={{ height: 44, width: 'auto' }} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Restaurant point of sale for the Resort Management System.
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Row label="Device" value={device?.name} />
          <Row label="Outlet" value={device?.outletName} />
          <Row label="Type" value={device?.deviceType} />
        </DialogContent>
      </Dialog>
    </Box>
  )
}

function FooterButton({ icon, label, onClick }) {
  return (
    <Button
      variant="contained"
      startIcon={icon}
      onClick={onClick}
      sx={{
        bgcolor: VIOLET,
        '&:hover': { bgcolor: '#4a30d6' },
        px: 3,
        py: 1.25,
        fontSize: 15,
        fontWeight: 700,
        borderRadius: 2.5,
        textTransform: 'none',
      }}
    >
      {label}
    </Button>
  )
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

function isManagerStaff(s) {
  const role = `${s.roleName || ''} ${s.userRole || ''}`.toLowerCase()
  return role.includes('manager') || role.includes('admin')
}
