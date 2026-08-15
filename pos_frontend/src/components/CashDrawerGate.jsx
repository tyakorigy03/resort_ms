import { useState } from 'react'
import { Alert, Box, Button, Chip, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { api } from '../api'

// Spec 3.2: full-screen cash-drawer gate shown after clock-in when the register
// has no confirmed opening count for today. The amount can only be confirmed,
// never skipped; Cancel returns to the welcome screen.
export default function CashDrawerGate({ device, shift, onConfirm, onCancel }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function confirm() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api.drawerConfirm(device.id, {
        openingCount: Number(amount),
        staffId: shift?.staffId || null,
      })
      onConfirm()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function onKey(key) {
    setError(null)
    if (key === 'clear') setAmount('')
    else setAmount((a) => (a + key).slice(0, 8))
  }

  const displayed = amount === '' ? '0.00' : Number(amount).toFixed(2)

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
        <Button color="error" size="large" onClick={onCancel} sx={{ fontSize: 16, textTransform: 'none' }}>
          Cancel
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {device?.name}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Cash
        </Typography>
        <Typography
          variant="h1"
          sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', mb: 1, letterSpacing: 1 }}
        >
          ${displayed}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Confirm cash amount.
        </Typography>

        {shift && (
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label={`Shift started at ${fmtTime(shift.clockedInAt)}`}
            color="success"
            variant="filled"
            sx={{ fontWeight: 600, mb: 3 }}
          />
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ width: 300 }}>
          <KeyGrid onKey={onKey} disabled={busy} />
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="primary"
          disabled={busy || amount === ''}
          onClick={confirm}
          sx={{ fontSize: 18, py: 1.6, fontWeight: 700, textTransform: 'none' }}
        >
          {busy ? 'Confirming…' : 'Confirm'}
        </Button>
      </Box>
    </Box>
  )
}

// Gate keypad per spec 3.2: 7 8 9 / 4 5 6 / 1 2 3 / 00 0 C.
function KeyGrid({ onKey, disabled }) {
  const rows = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['00', '0', 'clear'],
  ]
  return (
    <Box>
      {rows.map((row, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {row.map((key) => (
            <Button
              key={key}
              fullWidth
              variant="outlined"
              disabled={disabled}
              onClick={() => onKey(key)}
              sx={{ height: 58, fontSize: 20, fontWeight: 600 }}
            >
              {key === 'clear' ? 'C' : key}
            </Button>
          ))}
        </Box>
      ))}
    </Box>
  )
}

function fmtTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
