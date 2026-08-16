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
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { StatusChip } from '../lib/status.jsx'

const STATUSES = ['booked', 'checked_in', 'checked_out', 'no_show', 'cancelled']

function shortDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

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
            New reservation
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
            InputProps={{ inputProps: { min: form.checkInDate } }}
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
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
            <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setOpen(true)}>
              New reservation
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 720,
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
            </TableRow>
          </TableHead>
          <TableBody>
            {!rows ? (
              <TableRow>
                <TableCell colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover onClick={() => navigate(`/reservations/${r.id}`)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 500 }}>{r.guestName}</TableCell>
                  <TableCell>{r.roomNumber || '—'}</TableCell>
                  <TableCell>{r.roomTypeName || '—'}</TableCell>
                  <TableCell>{shortDate(r.checkInDate)}</TableCell>
                  <TableCell>{shortDate(r.checkOutDate)}</TableCell>
                  <TableCell>{r.nights}</TableCell>
                  <TableCell>{r.source ? r.source.replace('_', ' ') : '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={r.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
            {rows && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>No reservations.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <NewReservationDialog
      open={open}
      onClose={() => {
        setOpen(false)
        if (params.id === undefined) navigate('/reservations')
      }}
      onCreated={(reservation) => navigate(`/reservations/${reservation.id}`)}
    />
    </>
  )
}
