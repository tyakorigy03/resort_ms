import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { listReservations } from '../../api/reservations'

const STATUSES = ['booked', 'checked_in', 'checked_out', 'no_show', 'cancelled']

function statusColor(status) {
  switch (status) {
    case 'booked':
      return { bg: '#dbeafe', fg: '#1d4ed8' }
    case 'checked_in':
      return { bg: '#dcfce7', fg: '#15803d' }
    case 'checked_out':
      return { bg: '#f3f4f6', fg: '#6b7280' }
    case 'no_show':
      return { bg: '#fee2e2', fg: '#dc2626' }
    case 'cancelled':
      return { bg: '#f3f4f6', fg: '#6b7280' }
    default:
      return { bg: '#f3f4f6', fg: '#6b7280' }
  }
}

function ReservationsView() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [checkInDate, setCheckInDate] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRows(
        await listReservations({
          search: search || undefined,
          status: status || undefined,
          checkInDate: checkInDate || undefined,
        }),
      )
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, status, checkInDate])

  useEffect(() => {
    const timer = setTimeout(refresh, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [refresh, search])

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Reservations
          </Typography>
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
            <TextField
              size="small"
              variant="standard"
              label="Check-in date"
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

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
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const c = statusColor(r.status)
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{r.guestName}</TableCell>
                    <TableCell>{r.roomNumber || '—'}</TableCell>
                    <TableCell>{r.roomTypeName || '—'}</TableCell>
                    <TableCell>{r.checkInDate}</TableCell>
                    <TableCell>{r.checkOutDate}</TableCell>
                    <TableCell>{r.nights}</TableCell>
                    <TableCell>{r.source ? r.source.replace('_', ' ') : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.status.replace('_', ' ')}
                        size="small"
                        sx={{ height: 18, fontSize: '0.62rem', bgcolor: c.bg, color: c.fg }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>No reservations.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default ReservationsView
