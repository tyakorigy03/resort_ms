import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { saveMyShift } from '../myShift'
import KeyPad from './KeyPad'
import ShiftClockOut from './ShiftClockOut'

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// Direction when a staff card is tapped on the Clock in/out page:
// - Already on shift  -> clock OUT (summary -> drawer -> PIN, via ShiftClockOut).
// - Sale period open  -> clock the tapped staff IN (their own PIN or QR).
// Opening a closed sale period is handled by the dedicated SalePeriodDialog,
// so this modal never sees a closed period.
//
// Cash drawer: the opening float is asked as part of clock-in only when this
// register has no confirmed count for today, and is written straight to the
// drawer. The closing count is part of the clock-out flow.
export default function StaffClockModal({ open, staff, period, shifts, device, onClose, onChanged, onClockedIn }) {
  const [staffPin, setStaffPin] = useState('')
  const [staffQr, setStaffQr] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [needsCount, setNeedsCount] = useState(false)
  const [clockOutShift, setClockOutShift] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStaffPin('')
    setStaffQr('')
    setOpeningCash('')
    setError(null)
    setClockOutShift(null)
    if (device?.id) {
      api
        .drawerToday(device.id)
        .then((res) => setNeedsCount(!res.hasCountToday))
        .catch(() => setNeedsCount(false))
    } else {
      setNeedsCount(false)
    }
  }, [open, staff, device])

  const shift = open ? shifts?.find((s) => s.staffId === staff?.id) : null
  const title = shift ? `Clock out: ${staff?.name}` : `Clock in: ${staff?.name}`

  function onStaffPinKey(key) {
    setError(null)
    setStaffPin((p) => (key === 'back' ? p.slice(0, -1) : (p + key).slice(0, 4)))
  }

  async function doClockIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const body = staff.hasPin ? { staffId: staff.id, pin: staffPin } : { qrCode: staffQr.trim() }
      body.openingCash = openingCash.trim() === '' ? 0 : Number(openingCash)
      const shift = await api.clockIn(body)
      if (device?.id && needsCount) {
        await api.drawerConfirm(device.id, {
          openingCount: Number(openingCash) || 0,
          staffId: staff.id,
        })
      }
      saveMyShift(shift)
      onClockedIn(shift)
    } catch (err) {
      setError(err.message)
      setStaffPin('')
    } finally {
      setBusy(false)
    }
  }

  const canClockIn = staff?.hasPin ? staffPin.length >= 4 && !busy : Boolean(staffQr.trim()) && !busy

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose} size="small" disabled={busy}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }}>
            {error}
          </Alert>
        )}

        {shift ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }}>
              {staff?.name} clocked in at {fmtTime(shift.clockedInAt)}
              {shift.deviceName ? ` on ${shift.deviceName}` : ''}.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Clocking out shows your shift summary, asks you to confirm the cash drawer and sign off with your PIN.
            </Typography>
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" color="warning" onClick={() => setClockOutShift(shift)} disabled={busy}>
                Clock out
              </Button>
            </DialogActions>
          </Box>
        ) : (
          <Box>
            {period && (
              <Chip
                size="small"
                color="success"
                label={`Sales period open since ${fmtTime(period.openedAt)}`}
                sx={{ mb: 2, fontWeight: 600 }}
              />
            )}
            {staff?.hasPin ? (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 1.5 }}>
                  {staffPin.padEnd(4, ' ').split('').map((ch, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 34,
                        height: 42,
                        border: 2,
                        borderColor: ch !== ' ' ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: ch !== ' ' ? 'primary.light' : 'transparent',
                        fontSize: 17,
                      }}
                    >
                      {ch !== ' ' ? '•' : ''}
                    </Box>
                  ))}
                </Box>
                <KeyPad onKey={onStaffPinKey} disabled={busy} compact />
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Scan {staff?.name}'s QR badge or type the code below.
                </Typography>
                <TextField
                  fullWidth
                  placeholder="QR code"
                  value={staffQr}
                  onChange={(e) => setStaffQr(e.target.value)}
                  autoFocus
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doClockIn()
                  }}
                />
              </Box>
            )}
            {needsCount ? (
              <TextField
                label="Opening cash count"
                placeholder="Cash in the drawer at start"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                size="small"
                fullWidth
                value={openingCash}
                onChange={(e) => {
                  setError(null)
                  setOpeningCash(e.target.value)
                }}
                sx={{ mt: 1.5 }}
                helperText="Counted for this register's drawer."
              />
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Opening drawer already counted today.
              </Typography>
            )}
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" onClick={doClockIn} disabled={!canClockIn}>
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
          onClose()
        }}
      />
    </Dialog>
  )
}
