import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { saveMyShift } from '../myShift'
import KeyPad from './KeyPad'
import ShiftClockOut from './ShiftClockOut'

export default function ClockInDialog({ open, onClose, onChanged, device, initialStaffId, initialStep }) {
  const [staffList, setStaffList] = useState([])
  const [shifts, setShifts] = useState([])
  const [step, setStep] = useState(initialStep || 'list')
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [needsCount, setNeedsCount] = useState(false)
  const [pendingEvent, setPendingEvent] = useState(null)
  const [clockOutShift, setClockOutShift] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(initialStep || 'list')
    setSelected(null)
    setPin('')
    setQrCode('')
    setOpeningCash('')
    setClockOutShift(null)
    setPendingEvent(null)
    load()
    if (device?.id) {
      api
        .drawerToday(device.id)
        .then((res) => setNeedsCount(!res.hasCountToday))
        .catch(() => setNeedsCount(false))
    } else {
      setNeedsCount(false)
    }
  }, [open, initialStaffId, initialStep, device])

  async function load() {
    setError(null)
    try {
      const [staff, active] = await Promise.all([api.staffActive(), api.clockActive()])
      setStaffList(staff)
      setShifts(active)
      if (initialStaffId) {
        const target = staff.find((s) => s.id === initialStaffId)
        if (target && !active.some((s) => s.staffId === target.id)) {
          setSelected(target)
          setStep(target.hasPin ? 'pin' : 'qrcode')
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const clockedInIds = useMemo(() => new Set(shifts.map((s) => s.staffId)), [shifts])

  function openStaff(staff) {
    if (clockedInIds.has(staff.id)) return
    setSelected(staff)
    setPin('')
    setQrCode('')
    setOpeningCash('')
    setStep(staff.hasPin ? 'pin' : 'qrcode')
    setError(null)
  }

  async function doClockIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const body = selected.hasPin ? { staffId: selected.id, pin } : { qrCode: qrCode.trim() }
      body.openingCash = openingCash.trim() === '' ? 0 : Number(openingCash)
      const event = await api.clockIn(body)
      saveMyShift(event)
      if (needsCount) {
        setPendingEvent(event)
        setStep('opening')
        return
      }
      onChanged(event)
      reset()
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  async function confirmOpening() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (device?.id) {
        await api.drawerConfirm(device.id, {
          openingCount: Number(openingCash) || 0,
          staffId: selected?.id || null,
        })
      }
      onChanged(pendingEvent)
      reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function onKey(key) {
    setError(null)
    if (key === 'back') setPin((p) => p.slice(0, -1))
    else setPin((p) => (p + key).slice(0, 4))
  }

  function reset() {
    setStep('list')
    setSelected(null)
    setPin('')
    setQrCode('')
    setOpeningCash('')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {step === 'list' ? 'Staff clock in / out' : step === 'opening' ? 'Opening cash count' : `Clock in: ${selected?.name}`}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }}>
            {error}
          </Alert>
        )}

        {step === 'list' && (
          <>
            {shifts.length > 0 && (
              <List disablePadding>
                {shifts.map((s) => (
                  <ListItem
                    key={s.id}
                    secondaryAction={
                      <Button color="warning" size="small" disabled={busy} onClick={() => setClockOutShift(s)}>
                        Clock out
                      </Button>
                    }
                    sx={{ bgcolor: 'success.light', borderRadius: 1, mb: 1 }}
                  >
                    <ListItemText
                      primary={s.staffName}
                      secondary={`Clocked in ${formatTime(s.clockedInAt)}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {shifts.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No staff currently clocked in.
              </Typography>
            )}

            <Divider sx={{ my: 1.5 }}>
              <Chip label="Clock in" size="small" />
            </Divider>

            <List disablePadding>
              {staffList.map((s) => (
                <ListItemButton
                  key={s.id}
                  disabled={clockedInIds.has(s.id)}
                  onClick={() => openStaff(s)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={s.name}
                    secondary={s.hasPin ? 'Uses PIN' : 'Uses QR code'}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={clockedInIds.has(s.id) ? 'On shift' : 'Clock in'}
                    size="small"
                    color={clockedInIds.has(s.id) ? 'default' : 'primary'}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {step === 'opening' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              This register has no opening cash count for today. Enter the cash in the drawer to continue.
            </Typography>
            <TextField
              label="Opening cash count"
              placeholder="Cash in the drawer at start"
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              size="small"
              fullWidth
              autoFocus
              value={openingCash}
              onChange={(e) => {
                setError(null)
                setOpeningCash(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmOpening()
              }}
            />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={reset} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" onClick={confirmOpening} disabled={busy}>
                {busy ? '…' : 'Confirm'}
              </Button>
            </DialogActions>
          </Box>
        )}

        {step === 'pin' && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 2 }}>
              {pin.padEnd(4, ' ').split('').map((ch, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 44,
                    height: 54,
                    border: 2,
                    borderColor: ch !== ' ' ? 'primary.main' : 'divider',
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: ch !== ' ' ? 'primary.light' : 'transparent',
                    fontSize: 22,
                  }}
                >
                  {ch !== ' ' ? '•' : ''}
                </Box>
              ))}
            </Box>
            <KeyPad onKey={onKey} disabled={busy} />
            <DialogActions sx={{ px: 0 }}>
              <Button onClick={reset} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" onClick={doClockIn} disabled={pin.length < 4 || busy}>
                {busy ? '…' : 'Clock in'}
              </Button>
            </DialogActions>
          </Box>
        )}

        {step === 'qrcode' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Scan the staff QR badge or type the code below.
            </Typography>
            <TextField
              fullWidth
              placeholder="QR code"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              autoFocus
              size="small"
              onKeyDown={(e) => {
                if (e.key === 'Enter') doClockIn()
              }}
            />
            <DialogActions sx={{ px: 0 }}>
              <Button onClick={reset} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" onClick={doClockIn} disabled={!qrCode.trim() || busy}>
                {busy ? '…' : 'Clock in'}
              </Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>

      <ShiftClockOut
        open={Boolean(clockOutShift)}
        shift={clockOutShift}
        onClose={() => setClockOutShift(null)}
        onDone={() => {
          setClockOutShift(null)
          onChanged()
          reset()
        }}
      />
    </Dialog>
  )
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
