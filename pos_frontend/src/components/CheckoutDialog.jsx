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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { api } from '../api'
import { money } from '../format'

const QUICK_AMOUNTS = [5, 10, 20, 50, 100]

export default function CheckoutDialog({ open, order, onClose, onPaid }) {
  const [method, setMethod] = useState('cash')
  const [discount, setDiscount] = useState('')
  const [tip, setTip] = useState('')
  const [received, setReceived] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [folioSearch, setFolioSearch] = useState('')
  const [folioResults, setFolioResults] = useState(null)
  const [folioSearchError, setFolioSearchError] = useState(null)
  const [folio, setFolio] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setBusy(false)
      setMethod('cash')
      setDiscount('')
      setTip('')
      setReceived('')
      setFolio(null)
      setFolioResults(null)
      setFolioSearchError(null)
      setFolioSearch('')
    }
  }, [open])

  const subtotal = order?.subtotal || 0
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const tipN = Math.max(Number(tip) || 0, 0)
  const total = Math.round((subtotal - disc) * 100) / 100 + tipN
  const tendered = Number(received) || 0
  const change = Math.round((tendered - total) * 100) / 100

  async function searchFolios() {
    const query = folioSearch.trim()
    if (!query) return
    setFolioSearchError(null)
    setFolio(null)
    setFolioResults(null)
    try {
      const isRoom = /^[0-9]+$/.test(query)
      const result = await api.folioSearch(
        isRoom ? { roomNumber: query } : { guestName: query },
      )
      setFolioResults(result)
    } catch (err) {
      setFolioSearchError(err.message)
      setFolioResults([])
    }
  }

  async function pay() {
    if (busy) return
    if (method === 'room' && !folio) return
    setBusy(true)
    setError(null)
    try {
      const paid = await api.checkout(order.id, {
        paymentMethod: method,
        paymentReceived: method === 'cash' ? tendered : method === 'room' ? total : total,
        discount: disc,
        tip: tipN,
        folioId: method === 'room' ? folio.id : undefined,
      })
      onPaid(paid)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const payDisabled =
    busy || (method === 'cash' && tendered < total) || (method === 'room' && !folio)

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
          slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
          size="small"
          fullWidth
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          sx={{ mt: 1 }}
        />
        <TextField
          label="Tip"
          placeholder="0.00"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
          size="small"
          fullWidth
          value={tip}
          onChange={(e) => setTip(e.target.value)}
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
          <ToggleButton value="room" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Charge to room
          </ToggleButton>
        </ToggleButtonGroup>

        {method === 'cash' && (
          <Box>
            <TextField
              label="Recieved amount"
              placeholder="0.00"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
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

        {method === 'room' && (
          <Box sx={{ mt: 1 }}>
            {folio ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={`${folio.guestName} · Room ${folio.roomNumber || '—'} · ${money(folio.balance)}`}
                  color="success"
                  size="small"
                />
                <Button size="small" onClick={() => setFolio(null)}>
                  Change
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <TextField
                    label="Room number or guest name"
                    placeholder="e.g. 105"
                    size="small"
                    fullWidth
                    value={folioSearch}
                    onChange={(e) => setFolioSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchFolios()}
                    autoFocus
                  />
                  <Button
                    variant="outlined"
                    onClick={searchFolios}
                    disabled={!folioSearch.trim()}
                    startIcon={<SearchIcon />}
                  >
                    Search
                  </Button>
                </Box>
                {folioSearchError && (
                  <Alert severity="error" sx={{ mt: 1, fontSize: '0.85rem', py: 0.25 }}>
                    {folioSearchError}
                  </Alert>
                )}
                {folioResults && folioResults.length === 0 && !folioSearchError && (
                  <Alert severity="warning" sx={{ mt: 1, fontSize: '0.85rem', py: 0.25 }}>
                    No matching open folio. Check the room number or guest name.
                  </Alert>
                )}
                {folioResults && folioResults.length > 0 && (
                  <List dense sx={{ mt: 0.5, maxHeight: 220, overflow: 'auto' }}>
                    {folioResults.map((f) => (
                      <ListItem key={f.id} disablePadding>
                        <ListItemButton onClick={() => setFolio(f)}>
                          <ListItemText
                            primary={f.guestName}
                            secondary={`Room ${f.roomNumber || '—'} · ${money(f.balance)}`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
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
            disabled={payDisabled}
          >
            {busy ? 'Processing…' : `Pay - $${money(total)}`}
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
