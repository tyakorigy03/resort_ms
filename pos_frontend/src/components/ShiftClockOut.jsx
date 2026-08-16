import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { money } from '../format'
import KeyPad from './KeyPad'

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

// Full clock-out flow: shift summary -> closing cash-drawer count -> PIN
// sign-off -> reconciliation. Used from the /clock page and the register's
// top-bar clock action.
export default function ShiftClockOut({ open, shift, onClose, onDone }) {
  const [step, setStep] = useState('summary')
  const [summary, setSummary] = useState(null)
  const [closingCash, setClosingCash] = useState('')
  const [pin, setPin] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !shift) return
    setStep('summary')
    setSummary(null)
    setClosingCash('')
    setPin('')
    setResult(null)
    setError(null)
    api
      .clockSummary(shift.id)
      .then(setSummary)
      .catch((err) => setError(err.message))
  }, [open, shift])

  function onCashKey(key) {
    setError(null)
    if (key === 'clear') return setClosingCash('')
    if (key === 'back') return setClosingCash((c) => c.slice(0, -1))
    setClosingCash((c) => (c + key).slice(0, 8))
  }

  function onPinKey(key) {
    setError(null)
    if (key === 'back') setPin((p) => p.slice(0, -1))
    else setPin((p) => (p + key).slice(0, 4))
  }

  async function signOff() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.clockOut(shift.id, { closingCash: Number(closingCash), pin })
      setResult(res)
      setStep('result')
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  const cash = summary?.cash
  const variance = result?.cash?.variance

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {step === 'summary' ? `Shift summary: ${shift?.staffName}` : step === 'drawer' ? 'Confirm drawer' : step === 'pin' ? 'Sign off' : 'Clock out complete'}
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

        {step === 'summary' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Review your shift before signing off.
            </Typography>
            <Row label="Started" value={summary ? fmtTime(summary.clockedInAt) : '…'} />
            <Row label="Duration" value={summary ? fmtDuration(summary.durationSeconds) : '…'} />
            <Row label="Orders" value={summary ? summary.orderCount : '…'} />
            <Row label="Sales" value={summary ? money(summary.salesTotal) : '…'} />
            <Row label="Opening float" value={summary ? money(cash.opening) : '…'} />
            <Row label="Expected in till" value={summary ? money(cash.expected) : '…'} />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" onClick={() => setStep('drawer')} disabled={!summary || busy}>
                Continue
              </Button>
            </DialogActions>
          </Box>
        )}

        {step === 'drawer' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Count the cash in the drawer and enter the amount.
            </Typography>
            <Box sx={{ textAlign: 'center', my: 1.5 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                ${closingCash === '' ? '0.00' : Number(closingCash).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Expected {money(cash?.expected)}
              </Typography>
            </Box>
            <KeyPad onKey={onCashKey} disabled={busy} />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={() => setStep('summary')} disabled={busy}>
                Back
              </Button>
              <Button variant="contained" onClick={() => setStep('pin')} disabled={closingCash === '' || busy}>
                Confirm drawer
              </Button>
            </DialogActions>
          </Box>
        )}

        {step === 'pin' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Enter your PIN to clock out and sign off the shift.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 1.5 }}>
              {pin.padEnd(4, ' ').split('').map((ch, i) => (
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
            <KeyPad onKey={onPinKey} disabled={busy} compact />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={() => setStep('drawer')} disabled={busy}>
                Back
              </Button>
              <Button variant="contained" color="warning" onClick={signOff} disabled={pin.length < 4 || busy}>
                {busy ? 'Signing off…' : 'Sign off & clock out'}
              </Button>
            </DialogActions>
          </Box>
        )}

        {step === 'result' && (
          <Box>
            <Alert severity="success" sx={{ mb: 1.5, fontSize: '0.85rem', py: 0.25 }}>
              {shift?.staffName} clocked out. Shift finished.
            </Alert>
            <Row label="Shift length" value={fmtDuration(result.durationSeconds)} />
            <Row label="Orders" value={result.orderCount} />
            <Row label="Sales" value={money(result.salesTotal)} />
            <Row label="Opening float" value={money(result.cash.opening)} />
            <Row label="Expected in till" value={money(result.cash.expected)} />
            <Row label="Counted" value={money(result.cash.closing)} />
            <Row
              label="Variance"
              value={
                <Typography variant="body2" sx={{ fontWeight: 700, color: variance === 0 ? 'success.main' : variance > 0 ? 'warning.main' : 'error.main' }}>
                  {money(variance)}
                </Typography>
              }
            />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button variant="contained" onClick={onDone} disabled={busy}>
                Done
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
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  )
}
