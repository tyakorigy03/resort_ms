import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import PaymentsIcon from '@mui/icons-material/Payments'
import ReceiptIcon from '@mui/icons-material/Receipt'
import { api } from '../api'
import { formatDate, formatMoney } from '../lib/format'

function lineTypeColor(type) {
  switch (type) {
    case 'payment':
      return 'success'
    case 'pos_charge':
      return 'primary'
    case 'room_charge':
      return 'warning'
    case 'tax':
      return 'default'
    default:
      return 'default'
  }
}

function AddLineDialog({ folio, open, onClose, onDone }) {
  const [type, setType] = useState('charge')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setType('charge')
      setDescription('')
      setAmount('')
      setError(null)
    }
  }, [open])

  async function submit() {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const signed = type === 'payment' ? -amt : amt
      await api.addFolioLine(folio.id, {
        type: type === 'charge' ? 'adjustment' : type,
        description: description.trim() || (type === 'payment' ? 'Payment' : 'Charge'),
        amount: signed,
      })
      onClose()
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add line</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          size="small"
          fullWidth
          SelectProps={{ native: true }}
        >
          <option value="charge">Charge</option>
          <option value="payment">Payment</option>
          <option value="adjustment">Adjustment</option>
          <option value="tax">Tax</option>
        </TextField>
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth />
        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="small"
          fullWidth
          inputProps={{ min: 0, step: '0.01' }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RoomChargesDialog({ folio, open, onClose, onDone }) {
  const [nights, setNights] = useState('')
  const [rate, setRate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      const defaultNights = folio.checkInDate && folio.checkOutDate
        ? Math.max(1, Math.round((new Date(folio.checkOutDate) - new Date(folio.checkInDate)) / 86400000))
        : 1
      setNights(String(defaultNights))
      setRate(folio.baseRate ? folio.baseRate.toFixed(2) : '')
      setError(null)
    }
  }, [open, folio])

  async function submit() {
    const n = Number(nights)
    const r = Number(rate)
    if (!n || n <= 0) {
      setError('Enter a valid number of nights')
      return
    }
    if (r < 0 || rate === '') {
      setError('Enter a valid rate')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.postRoomCharges(folio.id, { nights: n, rate: r })
      onClose()
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Post room charges</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {formatDate(folio.checkInDate)} → {formatDate(folio.checkOutDate)}
        </Typography>
        <TextField label="Nights" type="number" value={nights} onChange={(e) => setNights(e.target.value)} size="small" fullWidth inputProps={{ min: 1 }} />
        <TextField label="Rate per night" type="number" value={rate} onChange={(e) => setRate(e.target.value)} size="small" fullWidth inputProps={{ min: 0, step: '0.01' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Total: {formatMoney(Number(nights || 0) * Number(rate || 0))}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          Post charges
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Folio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [folio, setFolio] = useState(null)
  const [error, setError] = useState(null)
  const [lineOpen, setLineOpen] = useState(false)
  const [chargesOpen, setChargesOpen] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setFolio(await api.folio(id))
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    const lines = folio?.lines || []
    return {
      charges: lines.reduce((sum, l) => sum + (l.amount > 0 ? l.amount : 0), 0),
      payments: lines.reduce((sum, l) => sum + (l.amount < 0 ? -l.amount : 0), 0),
    }
  }, [folio])

  if (error && !folio) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }
  if (!folio) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => (folio.reservationId ? navigate(`/reservations/${folio.reservationId}`) : navigate('/'))}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {folio.guestName}
        </Typography>
        {folio.roomNumber && <Chip label={`Room ${folio.roomNumber}`} color="primary" size="small" variant="outlined" />}
        <Chip label={folio.status} color={folio.status === 'open' ? 'success' : 'default'} size="small" />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: folio.balance > 0 ? 'error.main' : 'success.main' }}>
          {formatMoney(folio.balance)}
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Folio ledger
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                {folio.status === 'open' && (
                  <>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setLineOpen(true)} sx={{ mr: 1 }}>
                      Add line
                    </Button>
                    <Button size="small" variant="contained" startIcon={<ReceiptIcon />} onClick={() => setChargesOpen(true)}>
                      Post room charges
                    </Button>
                  </>
                )}
              </Box>
              <List dense disablePadding>
                {folio.lines.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No lines yet
                  </Typography>
                )}
                {folio.lines.map((line) => (
                  <Box key={line.id}>
                    <ListItem disableGutters sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {line.description}
                            </Typography>
                            <Chip label={line.type.replace('_', ' ')} color={lineTypeColor(line.type)} size="small" variant="outlined" />
                          </Box>
                        }
                        secondary={
                          <span>
                            {line.sourceOrderNumber && <span>Order {line.sourceOrderNumber} · </span>}
                            {new Date(line.createdAt).toLocaleString()}
                          </span>
                        }
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: line.amount < 0 ? 'success.main' : 'text.primary' }}>
                        {line.amount < 0 ? '-' : ''}
                        {formatMoney(Math.abs(line.amount))}
                      </Typography>
                    </ListItem>
                    <Divider />
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Charges
                </Typography>
                <Typography variant="body2">{formatMoney(totals.charges)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Payments
                </Typography>
                <Typography variant="body2">−{formatMoney(totals.payments)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Balance
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatMoney(folio.balance)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {folio.checkInDate && folio.checkOutDate
                  ? `Stay ${formatDate(folio.checkInDate)} → ${formatDate(folio.checkOutDate)}`
                  : 'Standalone folio'}
                {folio.roomTypeName ? ` · ${folio.roomTypeName}` : ''}
                {folio.ratePlanName ? ` · ${folio.ratePlanName}` : ''}
              </Typography>
            </CardContent>
          </Card>
          {folio.status === 'open' && folio.reservationId && (
            <Button
              fullWidth
              variant="contained"
              color="warning"
              startIcon={<PaymentsIcon />}
              onClick={() => navigate(`/reservations/${folio.reservationId}`)}
              sx={{ mt: 2 }}
            >
              Check out guest
            </Button>
          )}
        </Grid>
      </Grid>

      <AddLineDialog folio={folio} open={lineOpen} onClose={() => setLineOpen(false)} onDone={() => load()} />
      <RoomChargesDialog folio={folio} open={chargesOpen} onClose={() => setChargesOpen(false)} onDone={() => load()} />
    </Box>
  )
}
