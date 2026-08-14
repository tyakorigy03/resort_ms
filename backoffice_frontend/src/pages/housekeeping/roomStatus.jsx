import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
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
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { listRooms, updateRoom } from '../../api/rooms'
import { useToast } from '../../components/Toast'

const HK_STATUSES = ['clean', 'dirty', 'cleaning', 'inspected']

function hkColor(status) {
  if (status === 'clean') return 'success.main'
  if (status === 'dirty') return 'error.main'
  if (status === 'cleaning') return 'info.main'
  return 'warning.main'
}

function RoomStatus() {
  const showToast = useToast()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [savingId, setSavingId] = useState(null)

  async function load() {
    const rows = await listRooms()
    setRooms(rows)
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return rooms
    return rooms.filter((r) => r.housekeepingStatus === statusFilter)
  }, [rooms, statusFilter])

  const counts = useMemo(() => {
    const c = { all: rooms.length }
    HK_STATUSES.forEach((s) => {
      c[s] = rooms.filter((r) => r.housekeepingStatus === s).length
    })
    return c
  }, [rooms])

  async function handleSetStatus(room, status) {
    setSavingId(room.id)
    try {
      await updateRoom(room.id, { ...room, housekeepingStatus: status })
      showToast(`Room ${room.roomNumber} marked ${status}`)
      await load()
    } catch (err) {
      showToast(err.message || 'Failed to update room', 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Rooms status
          </Typography>
          <FormControl variant="standard" size="small" sx={{ ml: 1, minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Housekeeping</InputLabel>
            <Select
              label="Housekeeping"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              <MenuItem value="all">All ({counts.all})</MenuItem>
              {HK_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s} ({counts[s]})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={load}>
            Refresh
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 680,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Floor</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Occupancy</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Housekeeping</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Set status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              filtered.map((room) => (
                <TableRow key={room.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{room.roomNumber}</TableCell>
                  <TableCell>{room.roomTypeName || '—'}</TableCell>
                  <TableCell>{room.floor ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={room.status} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={room.housekeepingStatus || '—'}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', color: hkColor(room.housekeepingStatus) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {HK_STATUSES.map((s) => (
                        <Button
                          key={s}
                          size="small"
                          disabled={savingId === room.id}
                          onClick={() => handleSetStatus(room, s)}
                          sx={{
                            minWidth: 0,
                            fontSize: '0.62rem',
                            py: 0.15,
                            px: 0.75,
                            textTransform: 'none',
                            color: room.housekeepingStatus === s ? '#fff' : 'text.secondary',
                            bgcolor: room.housekeepingStatus === s ? 'primary.main' : '#f3f4f6',
                            '&:hover': { bgcolor: room.housekeepingStatus === s ? 'primary.main' : '#e5e7eb' },
                          }}
                        >
                          {s}
                        </Button>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No rooms found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default RoomStatus
