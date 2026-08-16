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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { api } from '../api'
import { formatDate } from '../lib/format'
import { StatusChip } from '../lib/status.jsx'

const STATUSES = ['booked', 'checked_in', 'checked_out', 'no_show', 'cancelled']

function NewReservationDialog({ open, onClose, onCreated }) {
  const [roomTypes, setRoomTypes] = useState([])
  const [ratePlans, setRatePlans] = useState([])
  const [customers, setCustomers] = useState([])
  const [customer, setCustomer] = useState(null)
  const [newCustomer, setNewCustomer] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    roomTypeId: '',
    ratePlanId: '',
    checkInDate: new Date().toISOString().slice(0, 10),
    checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    adults: 2,
    children: 0,
    source: 'walk_in',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [rt, rp, cs] = await Promise.all([api.roomTypes(), api.ratePlans(), api.customers()])
        if (!mounted) return
        setRoomTypes(rt)
        setRatePlans(rp)
        setCustomers(cs)
      } catch (err) {
        if (mounted) setLoadError(err.message)
      }
    }
    if (open) load()
    return () => {
      mounted = false
    }
  }, [open])

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
      const reservation = await api.createReservation({
        customerId: cid,
        roomTypeId: form.roomTypeId,
        ratePlanId: form.ratePlanId || undefined,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        adults: Number(form.adults),
        children: Number(form.children),
        source: form.source || 'walk_in',
        notes: form.notes || undefined,
      })
      onClose()
      onCreated(reservation)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        New reservation
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
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
          </Grid>
          {newCustomer ? (
            <>
              <Grid item xs={12} sm={6}>
                <TextField label="First name" value={form.firstName} onChange={set('firstName')} size="small" fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last name" value={form.lastName} onChange={set('lastName')} size="small" fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone" value={form.phone} onChange={set('phone')} size="small" fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" type="email" value={form.email} onChange={set('email')} size="small" fullWidth />
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={customers}
                getOptionLabel={(c) => `${c.firstName} ${c.lastName}${c.phone ? ` · ${c.phone}` : ''}`}
                value={customer}
                onChange={(e, v) => setCustomer(v)}
                renderInput={(params) => <TextField {...params} label="Search guest" />}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Stay
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Room type</InputLabel>
              <Select label="Room type" value={form.roomTypeId} onChange={set('roomTypeId')}>
                {roomTypes.map((rt) => (
                  <MenuItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Rate plan</InputLabel>
              <Select label="Rate plan" value={form.ratePlanId} onChange={set('ratePlanId')}>
                <MenuItem value="">None</MenuItem>
                {ratePlans.map((rp) => (
                  <MenuItem key={rp.id} value={rp.id}>
                    {rp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Check-in" type="date" value={form.checkInDate} onChange={set('checkInDate')} size="small" fullWidth required InputProps={{ inputProps: { min: today } }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Check-out" type="date" value={form.checkOutDate} onChange={set('checkOutDate')} size="small" fullWidth required InputProps={{ inputProps: { min: form.checkInDate } }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Adults" type="number" value={form.adults} onChange={set('adults')} size="small" fullWidth inputProps={{ min: 0 }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Children" type="number" value={form.children} onChange={set('children')} size="small" fullWidth inputProps={{ min: 0 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Source</InputLabel>
              <Select label="Source" value={form.source} onChange={set('source')}>
                <MenuItem value="walk_in">Walk-in</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
                <MenuItem value="ota">Online travel agency</MenuItem>
                <MenuItem value="direct">Direct</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notes" value={form.notes} onChange={set('notes')} size="small" fullWidth multiline minRows={2} />
          </Grid>
        </Grid>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}>
          Create reservation
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Reservations({ newBooking }) {
  const navigate = useNavigate()
  const params = useParams()
  const [open, setOpen] = useState(Boolean(newBooking))
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [checkInDate, setCheckInDate] = useState('')

  useEffect(() => {
    if (newBooking) setOpen(true)
  }, [newBooking])

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Reservations
        </Typography>
        <Chip label={`${openCount} upcoming / in-house`} color="primary" size="small" variant="outlined" />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          New reservation
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search guest / room"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 260 }}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Check-in date" type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} size="small" />
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        {!rows ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List dense disablePadding>
            {rows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No reservations match the current filters
              </Typography>
            )}
            {rows.map((r) => (
              <ListItem key={r.id} disablePadding divider>
                <ListItemButton onClick={() => navigate(`/reservations/${r.id}`)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.guestName}
                        </Typography>
                        {r.roomNumber && (
                          <Typography variant="caption" color="text.secondary">
                            Room {r.roomNumber}
                          </Typography>
                        )}
                        <StatusChip status={r.status} />
                      </Box>
                    }
                    secondary={`${formatDate(r.checkInDate)} → ${formatDate(r.checkOutDate)} · ${r.nights} night${r.nights === 1 ? '' : 's'} · ${r.roomTypeName || 'Room'}${r.source ? ` · ${r.source.replace('_', ' ')}` : ''}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Card>

      <NewReservationDialog
        open={open}
        onClose={() => {
          setOpen(false)
          if (params.id === undefined) navigate('/reservations')
        }}
        onCreated={(reservation) => navigate(`/reservations/${reservation.id}`)}
      />
    </Box>
  )
}
