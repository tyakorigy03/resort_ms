import { useEffect, useState } from 'react'
import {
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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { createRoom, deleteRoom, listRooms, updateRoom } from '../../api/rooms'
import { listRoomTypes } from '../../api/roomTypes'
import { useToast } from '../../components/Toast'

const ROOM_STATUSES = ['available', 'occupied', 'reserved', 'ooo']
const HK_STATUSES = ['clean', 'dirty', 'cleaning', 'inspected']

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function RoomDialog({ room = null, roomTypes, onSave, onClose }) {
  const [form, setForm] = useState({
    roomNumber: room?.roomNumber ?? '',
    roomTypeId: room?.roomTypeId ?? '',
    floor: room?.floor ?? '',
    status: room?.status ?? 'available',
    housekeepingStatus: room?.housekeepingStatus ?? 'dirty',
    isActive: room?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.roomNumber.trim() || !form.roomTypeId) {
      setError('Room number and type are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        roomNumber: form.roomNumber.trim(),
        roomTypeId: Number(form.roomTypeId),
        floor: form.floor === '' ? null : Number(form.floor),
        status: form.status,
        housekeepingStatus: form.housekeepingStatus,
        isActive: form.isActive,
      })
    } catch (err) {
      setError(err.message || 'Failed to save room')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 380, maxWidth: 380 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {room ? 'Edit room' : 'New room'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            autoFocus
            variant="standard"
            size="small"
            label="Room number"
            value={form.roomNumber}
            onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
            sx={inputSx}
          />
          <TextField
            variant="standard"
            size="small"
            label="Floor"
            type="number"
            value={form.floor}
            onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
            sx={inputSx}
          />
        </Box>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Room type</InputLabel>
          <Select
            label="Room type"
            value={form.roomTypeId}
            onChange={(e) => setForm((f) => ({ ...f, roomTypeId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {roomTypes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {ROOM_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Housekeeping</InputLabel>
          <Select
            label="Housekeeping"
            value={form.housekeepingStatus}
            onChange={(e) => setForm((f) => ({ ...f, housekeepingStatus: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {HK_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          }
          label="Active"
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }}
        />
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Rooms() {
  const showToast = useToast()
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, room: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listRooms(), listRoomTypes()])
      .then(([roomRows, typeRows]) => {
        if (active) {
          setRooms(roomRows)
          setRoomTypes(typeRows)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    const [roomRows, typeRows] = await Promise.all([listRooms(), listRoomTypes()])
    setRooms(roomRows)
    setRoomTypes(typeRows)
  }

  async function handleSave(data) {
    if (dialog.room) {
      await updateRoom(dialog.room.id, data)
      showToast('Room updated')
    } else {
      await createRoom(data)
      showToast('Room created')
    }
    setDialog({ open: false, room: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteRoom(confirmDelete.id)
      showToast('Room deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete room', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Rooms
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, room: null })}
          >
            New Room
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 640,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Floor</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Housekeeping</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Active</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{room.roomNumber}</TableCell>
                  <TableCell>{room.roomTypeName || '—'}</TableCell>
                  <TableCell>{room.floor ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={room.status}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        bgcolor:
                          room.status === 'occupied' ? '#fee2e2' : room.status === 'available' ? '#dcfce7' : '#f3f4f6',
                        color:
                          room.status === 'occupied' ? 'error.main' : room.status === 'available' ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={room.housekeepingStatus}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        bgcolor: room.housekeepingStatus === 'dirty' ? '#fee2e2' : '#f3f4f6',
                        color: room.housekeepingStatus === 'dirty' ? 'error.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={room.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: room.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, room })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(room)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No rooms yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <RoomDialog
          room={dialog.room}
          roomTypes={roomTypes}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, room: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete room
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete room "{confirmDelete?.roomNumber}"? Its housekeeping tasks are removed too.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default Rooms
