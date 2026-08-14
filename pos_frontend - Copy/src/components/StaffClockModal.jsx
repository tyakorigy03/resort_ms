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
import { money } from '../format'
import KeyPad from './KeyPad'

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// Direction when a staff card is tapped on the Clock in/out page:
// - Already on shift  -> clock OUT (works even if the period is closed).
// - Sale period open  -> clock the tapped staff IN (their own PIN or QR).
// Opening a closed sale period is handled by the dedicated SalePeriodDialog,
// so this modal never sees a closed period.
//
// Cash drawer: the till float is entered (optional, defaults to 0) at clock-in
// and the closing count is entered at clock-out, after which the expected-vs-
// counted variance is shown before the shift is finished.
export default function StaffClockModal({ open, staff, period, shifts, onClose, onChanged, onClockedIn }) {
  const [staffPin, setStaffPin] = useState('')
  const [staffQr, setStaffQr] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [cashResult, setCashResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStaffPin('')
    setStaffQr('')
    setOpeningCash('')
    setClosingCash('')
    setCashResult(null)
    setError(null)
  }, [open, staff])

  const shift = open ? shifts?.find((s) => s.staffId === staff?.id) : null
  const title = shift ? `Clock out: ${staff?.name}` : `Clock in: ${staff?.name}`

  async function doClockOut() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const closing = closingCash.trim() === '' ? null : Number(closingCash)
      const res = await api.clockOut(shift.id, { closingCash: closing })
      setCashResult(res.cash)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function finishClockOut() {
    setClosingCash('')
    setCashResult(null)
    onClose()
  }

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
      onClockedIn(shift)
    } catch (err) {
      setError(err.message)
      setStaffPin('')
    } finally {
      setBusy(false)
    }
  }

  const canClockIn = staff?.hasPin ? staffPin.length >= 4 && !busy : Boolean(staffQr.trim()) && !busy
  const closingNum = closingCash.trim() === '' ? null : Number(closingCash)
  const canClockOut = !busy && (closingCash.trim() === '' || (Number.isFinite(closingNum) && closingNum >= 0))
  const variance = cashResult?.variance

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

        {shift && cashResult && (
          <Box>
            <Alert severity="success" sx={{ mb: 1.5, fontSize: '0.85rem', py: 0.25 }}>
              {staff?.name} clocked out. Shift finished.
            </Alert>
            <Row label="Opening float" value={money(cashResult.opening)} />
            <Row label="Expected in till" value={money(cashResult.expected)} />
            <Row label="Counted" value={money(cashResult.closing)} />
            <Row
              label="Variance"
              value={
                <Typography variant="body2" sx={{ fontWeight: 700, color: variance === 0 ? 'success.main' : variance > 0 ? 'warning.main' : 'error.main' }}>
                  {variance == null ? 'Not counted' : money(variance)}
                </Typography>
              }
            />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button variant="contained" onClick={finishClockOut} disabled={busy}>
                Done
              </Button>
            </DialogActions>
          </Box>
        )}

        {shift && !cashResult && (
          <Box>
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }}>
              {staff?.name} clocked in at {fmtTime(shift.clockedInAt)}
              {shift.deviceName ? ` on ${shift.deviceName}` : ''}.
            </Alert>
            <TextField
              label="Closing cash count"
              placeholder="Leave blank if not counted"
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              size="small"
              fullWidth
              value={closingCash}
              onChange={(e) => {
                setError(null)
                setClosingCash(e.target.value)
              }}
            />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" color="warning" onClick={doClockOut} disabled={!canClockOut}>
                {busy ? '…' : 'Count & clock out'}
              </Button>
            </DialogActions>
          </Box>
        )}

        {!shift && (
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
            <TextField
              label="Opening float (optional)"
              placeholder="Defaults to 0"
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
            />
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
    </Dialog>
  )
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {value}
    </Box>
  )
}
