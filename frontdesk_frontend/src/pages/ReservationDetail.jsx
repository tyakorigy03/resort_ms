import { useCallback, useEffect, useState } from 'react'
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
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import PaymentsIcon from '@mui/icons-material/Payments'
import { api } from '../api'
import { formatDate } from '../lib/format'
import { StatusChip } from '../lib/status'

function hkColor(status) {
  switch (status) {
    case 'clean':
      return 'success'
    case 'dirty':
      return 'error'
    case 'cleaning':
      return 'info'
    default:
      return 'warning'
  }
}

function CheckInDialog({ reservation, open, onClose, onDone }) {
  const [rooms, setRooms] = useState(null)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    if (open) {
      setSelected(null)
      setError(null)
      api
        .availableRooms({
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          roomTypeId: reservation.roomTypeId,
        })
        .then((list) => {
          if (mounted) setRooms(list)
        })
        .catch((err) => {
          if (mounted) setError(err.message)
        })
    }
    return () => {
      mounted = false
    }
  }, [open, reservation])

  async function submit() {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const result = await api.checkIn(reservation.id, selected.id)
      onClose()
      onDone(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Check in {reservation.guestName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)} · {reservation.roomTypeName}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!rooms ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : rooms.length === 0 ? (
          <Alert severity="warning">No available rooms of this type for the stay dates.</Alert>
        ) : (
          <List dense disablePadding>
            {rooms.map((room) => (
              <ListItem key={room.id} disablePadding divider>
                <ListItemButton selected={selected?.id === room.id} onClick={() => setSelected(room)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Room {room.roomNumber}
                        </Typography>
                        <Chip label={`HK: ${room.housekeepingStatus}`} color={hkColor(room.housekeepingStatus)} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={room.roomTypeName}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
          disabled={!selected || busy}
          onClick={submit}
        >
          Check in
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ReservationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [forceReason, setForceReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setReservation(await api.getReservation(id))
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function doCheckOut() {
    setBusy(true)
    setError(null)
    try {
      await api.checkOut(id, forceReason.trim() || undefined)
      await load()
      setCheckOutOpen(false)
      setForceReason('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !reservation) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }
  if (!reservation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate('/reservations')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {reservation.guestName}
        </Typography>
        <StatusChip status={reservation.status} />
        {reservation.roomNumber && <Chip label={`Room ${reservation.roomNumber}`} color="primary" size="small" variant="outlined" />}
        <Box sx={{ flexGrow: 1 }} />
        {reservation.status === 'booked' && (
          <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={() => setCheckInOpen(true)}>
            Check in
          </Button>
        )}
        {reservation.status === 'checked_in' && (
          <>
            <Button
              variant="contained"
              startIcon={<PaymentsIcon />}
              onClick={() => navigate(`/folios/${reservation.folioId}`)}
            >
              Folio
            </Button>
            <Button variant="outlined" color="warning" startIcon={<ExitToAppIcon />} onClick={() => setCheckOutOpen(true)}>
              Check out
            </Button>
          </>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Stay
              </Typography>
              <Typography variant="body2">
                {formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)} ·{' '}
                {reservation.nights} night{reservation.nights === 1 ? '' : 's'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {reservation.roomTypeName} {reservation.ratePlanName ? `· ${reservation.ratePlanName}` : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={`${reservation.adults} adult${reservation.adults === 1 ? '' : 's'}`} size="small" />
                <Chip label={`${reservation.children} child${reservation.children === 1 ? '' : 's'}`} size="small" />
                {reservation.source && <Chip label={reservation.source.replace('_', ' ')} size="small" variant="outlined" />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Guest
              </Typography>
              <Typography variant="body2">
                {reservation.firstName} {reservation.lastName}
              </Typography>
              {reservation.phone && <Typography variant="body2">{reservation.phone}</Typography>}
              {reservation.email && <Typography variant="body2">{reservation.email}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        {reservation.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {reservation.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <CheckInDialog
        reservation={reservation}
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onDone={() => {
          load()
        }}
      />

      <Dialog open={checkOutOpen} onClose={() => setCheckOutOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Check out {reservation.guestName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            The folio must have a zero balance to check out.
          </Typography>
          <TextField
            label="Force close reason (optional)"
            value={forceReason}
            onChange={(e) => setForceReason(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            helperText="Only needed when the folio has an outstanding balance."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCheckOutOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={doCheckOut}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <ExitToAppIcon />}
          >
            Check out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
