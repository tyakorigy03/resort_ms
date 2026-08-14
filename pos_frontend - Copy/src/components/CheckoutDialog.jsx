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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { money } from '../format'

const QUICK_AMOUNTS = [5, 10, 20, 50, 100]

export default function CheckoutDialog({ open, onClose, cart, staffId, onPaid }) {
  const [method, setMethod] = useState('cash')
  const [discount, setDiscount] = useState('')
  const [received, setReceived] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setBusy(false)
      setMethod('cash')
      setDiscount('')
      setReceived('')
    }
  }, [open])

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const total = subtotal - disc
  const tendered = Number(received) || 0
  const change = tendered - total

  async function pay() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const order = await api.createOrder({
        items: cart.map((l) => ({ itemId: l.itemId, quantity: l.qty })),
        discount: disc,
        paymentMethod: method,
        paymentReceived: method === 'cash' ? tendered : total,
        staffId,
      })
      onPaid(order)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Checkout
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

        <Row label="Subtotal" value={money(subtotal)} />
        <TextField
          label="Discount"
          placeholder="0.00"
          type="number"
          inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
          size="small"
          fullWidth
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          sx={{ mt: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: 2, borderColor: 'divider' }}>
          <Typography variant="body1">Total</Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 19 }}>
            {money(total)}
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={method}
          exclusive
          onChange={(_, v) => v && setMethod(v)}
          fullWidth
          size="small"
          sx={{ mt: 1.5, mb: 0.5 }}
        >
          <ToggleButton value="cash" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cash
          </ToggleButton>
          <ToggleButton value="card" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Card
          </ToggleButton>
        </ToggleButtonGroup>

        {method === 'cash' && (
          <Box>
            <TextField
              label="Amount tendered"
              placeholder="0.00"
              type="number"
              inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
              size="small"
              fullWidth
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              sx={{ mt: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map((a) => (
                <Button
                  key={a}
                  variant="outlined"
                  size="small"
                  sx={{ flexGrow: 1, fontWeight: 700 }}
                  onClick={() => setReceived(a >= total ? String(a) : String(Math.ceil(total / a) * a))}
                >
                  {money(a)}
                </Button>
              ))}
            </Box>
            {received !== '' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, color: change < 0 ? 'error.main' : 'text.primary' }}>
                <Typography variant="body2">Change</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {money(change)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <DialogActions sx={{ px: 0 }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={pay}
            disabled={busy || (method === 'cash' && tendered < total)}
          >
            {busy ? 'Processing…' : `Charge ${money(total)}`}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  )
}
