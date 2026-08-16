import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import PaymentsIcon from '@mui/icons-material/Payments'
import { api } from '../api'
import { StatusChip } from '../lib/status.jsx'

const STATUSES = ['booked', 'checked_in', 'checked_out', 'no_show', 'cancelled']

function shortDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysLocal(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function emptyForm() {
  const today = todayLocal()
  return {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    roomTypeId: '',
    ratePlanId: '',
    roomId: '',
    checkInDate: today,
    checkOutDate: addDaysLocal(today, 1),
    adults: 2,
    children: 0,
    source: 'walk_in',
    notes: '',
  }
}

function ReservationDialog({ open, reservation, onClose, onSaved }) {
  const editing = Boolean(reservation)
  const [roomTypes, setRoomTypes] = useState([])
  const [ratePlans, setRatePlans] = useState([])
  const [customers, setCustomers] = useState([])
  const [customer, setCustomer] = useState(null)
  const [newCustomer, setNewCustomer] = useState(false)
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const today = todayLocal()

  useEffect(() => {
    if (!open) return
    setForm(editing ? {
      firstName: reservation.firstName || '',
      lastName: reservation.lastName || '',
      phone: reservation.phone || '',
      email: reservation.email || '',
      roomTypeId: reservation.roomTypeId || '',
      ratePlanId: reservation.ratePlanId || '',
      roomId: reservation.roomId || '',
      checkInDate: toDateInput(reservation.checkInDate),
      checkOutDate: toDateInput(reservation.checkOutDate),
      adults: reservation.adults ?? 2,
      children: reservation.children ?? 0,
      source: reservation.source || 'walk_in',
      notes: reservation.notes || '',
    } : emptyForm())
    setNewCustomer(false)
    setCustomer(null)
    setError(null)
  }, [open, editing, reservation])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [rt, rp, cs] = await Promise.all([api.roomTypes(), api.ratePlans(), api.customers()])
        if (!mounted) return
        setRoomTypes(rt)
        setRatePlans(rp)
        setCustomers(cs)
        if (editing) setCustomer(cs.find((c) => c.id === reservation.customerId) || null)
      } catch (err) {
        if (mounted) setLoadError(err.message)
      }
    }
    if (open) load()
    return () => {
      mounted = false
    }
  }, [open, editing, reservation])

  useEffect(() => {
    let mounted = true
    const { roomTypeId, checkInDate, checkOutDate } = form
    if (!roomTypeId || !checkInDate || !checkOutDate) {
      setRooms([])
      return
    }
    setRoomsLoading(true)
    api
      .availableRooms({ checkInDate, checkOutDate, roomTypeId })
      .then((list) => {
        if (!mounted) return
        let merged = list
        if (editing && reservation.roomId && !list.some((x) => x.id === reservation.roomId)) {
          merged = [...list, { id: reservation.roomId, roomNumber: reservation.roomNumber || String(reservation.roomId) }]
        }
        setRooms(merged)
        setForm((f) => (f.roomId && !merged.some((x) => x.id === f.roomId) ? { ...f, roomId: '' } : f))
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setRoomsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [form.roomTypeId, form.checkInDate, form.checkOutDate, editing, reservation])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit() {
    setError(null)
    if (!customer && (!form.firstName.trim() || !form.lastName.trim())) {
      setError('Select an existing guest or enter a new guest name')
      return
    }
    if (!form.roomTypeId || !form.checkInDate || !form.checkOutDate) {
      setError('Room type, check-in and check-out dates are required')
      return
    }
    if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) {
      setError('Check-out must be after check-in')
      return
    }
    if (form.roomId && !rooms.some((x) => x.id === form.roomId)) {
      setError('Selected room is no longer available for these dates')
      return
    }
    setBusy(true)
    try {
      let cid = customer?.id
      if (!cid) {
        const created = await api.createCustomer({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
        })
        cid = created.id
      }
      const payload = {
        customerId: cid,
        roomTypeId: form.roomTypeId,
        ratePlanId: form.ratePlanId || undefined,
        roomId: form.roomId || undefined,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        adults: Number(form.adults),
        children: Number(form.children),
        source: form.source || 'walk_in',
        notes: form.notes || undefined,
      }
      const saved = editing
        ? await api.updateReservation(reservation.id, payload)
        : await api.createReservation(payload)
      onClose()
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            width: { xs: 'calc(100% - 24px)', sm: 560 },
            maxWidth: { xs: 'calc(100% - 24px)', sm: 560 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {editing ? 'Edit reservation' : 'New reservation'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: '1 1 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 340,
        }}
      >
        {loadError && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {loadError}
          </Typography>
        )}

        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600, mt: 0.5 }}>
          Guest
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={newCustomer ? 'new' : 'existing'}
          onChange={(e, v) => {
            if (!v) return
            setNewCustomer(v === 'new')
            setError(null)
          }}
          fullWidth
        >
          <ToggleButton value="existing">Existing guest</ToggleButton>
          <ToggleButton value="new">New guest</ToggleButton>
        </ToggleButtonGroup>

        {newCustomer ? (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                autoFocus
                variant="standard"
                size="small"
                label="First name"
                value={form.firstName}
                onChange={set('firstName')}
                fullWidth
                required
                sx={inputSx}
              />
              <TextField
                variant="standard"
                size="small"
                label="Last name"
                value={form.lastName}
                onChange={set('lastName')}
                fullWidth
                required
                sx={inputSx}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField variant="standard" size="small" label="Phone" value={form.phone} onChange={set('phone')} fullWidth sx={inputSx} />
              <TextField variant="standard" size="small" label="Email" type="email" value={form.email} onChange={set('email')} fullWidth sx={inputSx} />
            </Box>
          </>
        ) : (
          <Autocomplete
            size="small"
            options={customers}
            getOptionLabel={(c) => `${c.firstName} ${c.lastName}${c.phone ? ` · ${c.phone}` : ''}`}
            value={customer}
            onChange={(e, v) => setCustomer(v)}
            renderInput={(params) => <TextField {...params} variant="standard" label="Search guest" sx={inputSx} />}
          />
        )}

        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600, mt: 0.5 }}>
          Stay
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl variant="standard" size="small" fullWidth sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Room type</InputLabel>
            <Select
              label="Room type"
              value={form.roomTypeId}
              onChange={set('roomTypeId')}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              {roomTypes.map((rt) => (
                <MenuItem key={rt.id} value={rt.id}>
                  {rt.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="standard" size="small" fullWidth sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Rate plan</InputLabel>
            <Select
              label="Rate plan"
              value={form.ratePlanId}
              onChange={set('ratePlanId')}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              <MenuItem value="">None</MenuItem>
              {ratePlans.map((rp) => (
                <MenuItem key={rp.id} value={rp.id}>
                  {rp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <FormControl variant="standard" size="small" fullWidth sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Room</InputLabel>
          <Select
            label="Room"
            value={form.roomId}
            onChange={set('roomId')}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {rooms.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                Room {r.roomNumber}
                {r.floor != null ? ` · Floor ${r.floor}` : ''}
                {r.housekeepingStatus ? ` · ${r.housekeepingStatus}` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.66rem' }}>
          {roomsLoading ? 'Loading rooms…' : `${rooms.length} room${rooms.length === 1 ? '' : 's'} available for the selected dates`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            variant="standard"
            size="small"
            label="Check-in"
            type="date"
            value={form.checkInDate}
            onChange={set('checkInDate')}
            fullWidth
            required
            sx={inputSx}
            InputProps={{ inputProps: { min: today } }}
          />
          <TextField
            variant="standard"
            size="small"
            label="Check-out"
            type="date"
            value={form.checkOutDate}
            onChange={set('checkOutDate')}
            fullWidth
            required
            sx={inputSx}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField variant="standard" size="small" label="Adults" type="number" value={form.adults} onChange={set('adults')} fullWidth inputProps={{ min: 0 }} sx={inputSx} />
          <TextField variant="standard" size="small" label="Children" type="number" value={form.children} onChange={set('children')} fullWidth inputProps={{ min: 0 }} sx={inputSx} />
          <FormControl variant="standard" size="small" fullWidth sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Source</InputLabel>
            <Select
              label="Source"
              value={form.source}
              onChange={set('source')}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              <MenuItem value="walk_in">Walk-in</MenuItem>
              <MenuItem value="phone">Phone</MenuItem>
              <MenuItem value="ota">Online travel agency</MenuItem>
              <MenuItem value="direct">Direct</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TextField variant="standard" size="small" label="Notes" value={form.notes} onChange={set('notes')} fullWidth multiline minRows={2} sx={inputSx} />

        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={submit} disabled={busy}>
          {editing ? 'Save changes' : 'Create reservation'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function DetailsModal({ reservation, onClose, onEdit, onCheckIn, onCheckOut, onDelete, onOpenFolio }) {
  if (!reservation) return null
  const row = (label, value) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.74rem', fontWeight: 500, textAlign: 'right' }}>{value}</Typography>
    </Box>
  )
  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { borderRadius: 2, width: 460, maxWidth: 'calc(100% - 24px)', display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', flexGrow: 1 }}>
            {reservation.guestName}
          </Typography>
          <StatusChip status={reservation.status} />
          {reservation.roomNumber && <Chip label={`Room ${reservation.roomNumber}`} color="primary" size="small" variant="outlined" />}
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' }}>
            Stay
          </Typography>
          {row('Room', reservation.roomNumber ? `Room ${reservation.roomNumber}` : 'Unassigned')}
          {row('Room type', reservation.roomTypeName || '—')}
          {row('Check-in', shortDate(reservation.checkInDate))}
          {row('Check-out', shortDate(reservation.checkOutDate))}
          {row('Nights', reservation.nights)}
          {row('Rate plan', reservation.ratePlanName || '—')}
          {row('Source', reservation.source ? reservation.source.replace('_', ' ') : '—')}
        </Box>
        <Divider />
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' }}>
            Guest
          </Typography>
          {row('Name', `${reservation.firstName} ${reservation.lastName}`)}
          {row('Phone', reservation.phone || '—')}
          {row('Email', reservation.email || '—')}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'error.main' }} startIcon={<DeleteOutlinedIcon sx={{ fontSize: 15 }} />} onClick={onDelete}>
          Delete
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {reservation.status === 'booked' && (
          <Button size="small" variant="contained" startIcon={<CheckCircleIcon sx={{ fontSize: 15 }} />} onClick={onCheckIn}>
            Check in
          </Button>
        )}
        {reservation.status === 'checked_in' && (
          <>
            {reservation.folioId && (
              <Button size="small" variant="outlined" startIcon={<PaymentsIcon sx={{ fontSize: 15 }} />} onClick={onOpenFolio}>
                Folio
              </Button>
            )}
            <Button size="small" variant="outlined" color="warning" startIcon={<ExitToAppIcon sx={{ fontSize: 15 }} />} onClick={onCheckOut}>
              Check out
            </Button>
          </>
        )}
        <Button size="small" variant="contained" startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />} onClick={onEdit}>
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CheckInDialog({ reservation, onClose, onDone }) {
  const [rooms, setRooms] = useState([])
  const [roomId, setRoomId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let mounted = true
    if (!reservation) return
    setRoomId(reservation.roomId || '')
    api
      .availableRooms({
        checkInDate: toDateInput(reservation.checkInDate),
        checkOutDate: toDateInput(reservation.checkOutDate),
        roomTypeId: reservation.roomTypeId,
      })
      .then((list) => {
        if (!mounted) return
        let merged = list
        if (reservation.roomId && !list.some((x) => x.id === reservation.roomId)) {
          merged = [...list, { id: reservation.roomId, roomNumber: reservation.roomNumber || String(reservation.roomId) }]
        }
        setRooms(merged)
        if (!reservation.roomId) setRoomId(merged[0]?.id || '')
      })
      .catch((err) => {
        if (mounted) setLoadError(err.message)
      })
    return () => {
      mounted = false
    }
  }, [reservation])

  async function confirm() {
    if (!roomId) {
      setError('Select a room')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.checkIn(reservation.id, roomId)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!reservation) return null

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { borderRadius: 2, width: 400, maxWidth: 'calc(100% - 24px)', display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Check in {reservation.guestName}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 2, pt: 1 }}>
        <FormControl variant="standard" size="small" fullWidth>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Room</InputLabel>
          <Select
            label="Room"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value)
              setError(null)
            }}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {rooms.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                Room {r.roomNumber}
                {r.floor != null ? ` · Floor ${r.floor}` : ''}
                {r.housekeepingStatus ? ` · ${r.housekeepingStatus}` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {loadError && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {loadError}
          </Typography>
        )}
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={confirm} disabled={busy || rooms.length === 0}>
          Check in
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CheckOutDialog({ reservation, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [force, setForce] = useState(false)
  const [reason, setReason] = useState('')

  async function doCheckout(freason) {
    setBusy(true)
    setError(null)
    try {
      await api.checkOut(reservation.id, freason)
      onDone()
    } catch (err) {
      if (!freason && /outstanding balance|balance/i.test(err.message)) setForce(true)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!reservation) return null

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { borderRadius: 2, width: 420, maxWidth: 'calc(100% - 24px)', display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Check out {reservation.guestName}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2">
          Confirm checkout for Room {reservation.roomNumber || reservation.roomTypeName || '—'}.
        </Typography>
        {error && <Alert severity={force ? 'warning' : 'error'}>{error}</Alert>}
        {force && (
          <TextField
            variant="standard"
            size="small"
            label="Reason for forced checkout"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        {force ? (
          <Button size="small" variant="contained" color="warning" onClick={() => doCheckout(reason.trim())} disabled={busy || !reason.trim()}>
            Force check out
          </Button>
        ) : (
          <Button size="small" variant="contained" onClick={() => doCheckout(undefined)} disabled={busy}>
            Check out
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

function ConfirmDialog({ open, title, message, confirmLabel, busy, error, onConfirm, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { borderRadius: 2, width: 400, maxWidth: 'calc(100% - 24px)', display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 2, pt: 1 }}>
        <Typography variant="body2">{message}</Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="error" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Reservations({ newBooking }) {
  const navigate = useNavigate()
  const params = useParams()
  const [dialog, setDialog] = useState(() => (newBooking ? { mode: 'create' } : null))
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [checkInDate, setCheckInDate] = useState('')

  const [detailsFor, setDetailsFor] = useState(null)
  const [checkInFor, setCheckInFor] = useState(null)
  const [checkOutFor, setCheckOutFor] = useState(null)
  const [deleteFor, setDeleteFor] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await api.reservations({
        search: search || undefined,
        status: status || undefined,
        checkInDate: checkInDate || undefined,
      })
      setRows(list)
    } catch (err) {
      setError(err.message)
    }
  }, [search, status, checkInDate])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const openCount = useMemo(() => (rows || []).filter((r) => r.status === 'booked' || r.status === 'checked_in').length, [rows])

  const refreshDetails = useCallback(async (id) => {
    try {
      const fresh = await api.getReservation(id)
      setDetailsFor(fresh)
    } catch {
      // keep the last known row
    }
  }, [])

  const handleSaved = useCallback(
    async (saved) => {
      await load()
      setDialog(null)
      if (detailsFor?.id === saved.id) setDetailsFor(saved)
    },
    [load, detailsFor],
  )

  const handleCheckIn = useCallback(async () => {
    const id = checkInFor?.id
    await load()
    setCheckInFor(null)
    if (id && detailsFor?.id === id) await refreshDetails(id)
  }, [load, checkInFor, detailsFor, refreshDetails])

  const handleCheckOut = useCallback(async () => {
    const id = checkOutFor?.id
    await load()
    setCheckOutFor(null)
    if (id && detailsFor?.id === id) await refreshDetails(id)
  }, [load, checkOutFor, detailsFor, refreshDetails])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.removeReservation(deleteFor.id)
      await load()
      const id = deleteFor.id
      setDeleteFor(null)
      setDetailsFor((d) => (d && d.id === id ? null : d))
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }, [deleteFor, load])

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Reservations
              </Typography>
              <Chip label={`${openCount} upcoming / in-house`} color="primary" size="small" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                variant="standard"
                label="Search guest / room"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 180 }}
              />
              <FormControl variant="standard" size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ minWidth: 140 }}>
                <Typography variant="caption" component="label" htmlFor="checkInDateFilter" sx={{ display: 'block', fontSize: '0.68rem', color: 'text.secondary', mb: 0.25 }}>
                  Check-in date
                </Typography>
                <TextField
                  id="checkInDateFilter"
                  size="small"
                  variant="standard"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </Box>
              <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialog({ mode: 'create' })}>
                New reservation
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}

          <Table
            size="small"
            sx={{
              tableLayout: 'fixed',
              minWidth: 820,
              '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Guest</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check-in</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check-out</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nights</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!rows ? (
                <TableRow>
                  <TableCell colSpan={9}>Loading...</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} hover onClick={() => setDetailsFor(r)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 500 }}>{r.guestName}</TableCell>
                    <TableCell>{r.roomNumber ? `Room ${r.roomNumber}` : '—'}</TableCell>
                    <TableCell>{r.roomTypeName || '—'}</TableCell>
                    <TableCell>{shortDate(r.checkInDate)}</TableCell>
                    <TableCell>{shortDate(r.checkOutDate)}</TableCell>
                    <TableCell>{r.nights}</TableCell>
                    <TableCell>{r.source ? r.source.replace('_', ' ') : '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="Edit" onClick={(e) => { e.stopPropagation(); setDialog({ mode: 'edit', reservation: r }) }}>
                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteFor(r) }}>
                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {rows && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9}>No reservations.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReservationDialog
        open={Boolean(dialog)}
        reservation={dialog?.mode === 'edit' ? dialog.reservation : null}
        onClose={() => {
          setDialog(null)
          if (params.id === undefined) navigate('/reservations')
        }}
        onSaved={handleSaved}
      />
      <DetailsModal
        reservation={detailsFor}
        onClose={() => setDetailsFor(null)}
        onEdit={() => detailsFor && setDialog({ mode: 'edit', reservation: detailsFor })}
        onCheckIn={() => detailsFor && setCheckInFor(detailsFor)}
        onCheckOut={() => detailsFor && setCheckOutFor(detailsFor)}
        onDelete={() => {
          if (detailsFor) {
            setDeleteError(null)
            setDeleteFor(detailsFor)
          }
        }}
        onOpenFolio={() => detailsFor?.folioId && navigate(`/folios/${detailsFor.folioId}`)}
      />
      <CheckInDialog reservation={checkInFor} onClose={() => setCheckInFor(null)} onDone={handleCheckIn} />
      <CheckOutDialog reservation={checkOutFor} onClose={() => setCheckOutFor(null)} onDone={handleCheckOut} />
      <ConfirmDialog
        open={Boolean(deleteFor)}
        title="Delete reservation"
        message={`Delete the reservation for ${deleteFor?.guestName || ''}? It will be marked as cancelled.`}
        confirmLabel="Delete"
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleting) setDeleteFor(null)
        }}
      />
    </>
  )
}
