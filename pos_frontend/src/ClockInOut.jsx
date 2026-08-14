import { useEffect, useState } from 'react'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import StaffClockModal from './components/StaffClockModal'
import SalePeriodDialog from './components/SalePeriodDialog'
import undrawTime from './assets/undraw_time-management_4ss6.svg'

export default function ClockInOut({ onBack, onClockedIn }) {
  const [staff, setStaff] = useState([])
  const [period, setPeriod] = useState(null)
  const [shifts, setShifts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(null)
  const [periodDialog, setPeriodDialog] = useState(false)

  function load() {
    return Promise.all([api.staffActive(), api.salePeriodCurrent(), api.clockActive()])
      .then(([s, p, c]) => {
        setStaff(s)
        setPeriod(p)
        setShifts(c)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const q = search.trim().toLowerCase()
  const filtered = staff.filter((s) => !q || s.name.toLowerCase().includes(q))
  const clockedIn = new Set(shifts.map((s) => s.staffId))

  function onStaffClick(s) {
    if (clockedIn.has(s.id) || period) {
      setSelected(s)
    } else {
      setPending(s)
      setPeriodDialog(true)
    }
  }

  return (
    <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column', bgcolor: '#f1f5f9' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense" sx={{ position: 'relative', py: 0.5 }}>
          <Button
            color="inherit"
            startIcon={<ArrowLeftIcon />}
            onClick={onBack}
            sx={{ position: 'absolute', left: 8, textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, width: '100%', textAlign: 'center' }}>
            Clock in/out
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: 'flex', gap: 6, px: 4, py: 3, minHeight: 0 }}>
        
        <Box sx={{ width: '40%', maxWidth: 480, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Typography variant="h4">
              Clock in/out
            </Typography>
          <Typography variant="caption2" color="text.secondary" sx={{ mb:2 }}>
              Tap a name to clock in or out. A manager opens/closes the sales period.
            </Typography>

          {period ? (
            <Alert severity="success" sx={{ mb: 1.5, fontSize: '0.85rem', py: 0.25 }}>
              Sales period open since{' '}
              {new Date(period.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {period.openedByStaffName ? ` · opened by ${period.openedByStaffName}` : ''}
            </Alert>
          ) : (
            <Alert
              severity="warning"
              sx={{ mb: 1.5, fontSize: '0.85rem', py: 0.25 }}
              action={
                <Button size="small" color="inherit" onClick={() => setPeriodDialog(true)}>
                  Open sale period
                </Button>
              }
            >
              Sales period is closed — nobody can clock in yet.
            </Alert>
          )}

          <TextField
            size="small"
            fullWidth
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ flexGrow: 1, overflowY: 'auto', mt: 2 }}>
            {loading ? (
              <CircularProgress size={28} sx={{ display: 'block', mx: 'auto', mt: 4, mb: 4 }} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filtered.map((s) => (
                  <Box
                    key={s.id}
                    onClick={() => onStaffClick(s)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: clockedIn.has(s.id) ? 'success.main' : 'divider',
                      borderRadius: 1,
                      p: 1.5,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 38, height: 38 }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="body1" sx={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.75, flexGrow: 1 }}>
                      {s.name}
                      {s.hasPin && <LockIcon sx={{ fontSize: 15, color: 'text.secondary' }} />}
                    </Typography>
                    {clockedIn.has(s.id) && (
                      <Chip
                        label="On shift"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    {(s.userRole || s.roleName || s.position) && (
                      <Chip
                        label={s.userRole || s.roleName || s.position}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                ))}
                {filtered.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No staff found.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <img
            src={undrawTime}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '80%', width: 'auto', height: 'auto' }}
          />
        </Box>
      </Box>

      <StaffClockModal
        open={Boolean(selected)}
        staff={selected}
        period={period}
        shifts={shifts}
        onClose={() => setSelected(null)}
        onChanged={load}
        onClockedIn={() => {
          setSelected(null)
          onClockedIn()
        }}
      />
      <SalePeriodDialog
        open={periodDialog}
        onClose={() => {
          setPending(null)
          setPeriodDialog(false)
        }}
        period={null}
        onChanged={() => {
          setPeriodDialog(false)
          load().then(() => {
            if (pending) {
              setSelected(pending)
              setPending(null)
            }
          })
        }}
      />
    </Box>
  )
}
