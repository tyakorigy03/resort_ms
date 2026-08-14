import { useEffect, useMemo, useState } from 'react'
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
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import {
  createHousekeepingTask,
  deleteHousekeepingTask,
  listHousekeepingTasks,
  updateHousekeepingTask,
} from '../../api/housekeeping'
import { listRooms } from '../../api/rooms'
import { listStaff } from '../../api/staff'
import { useToast } from '../../components/Toast'

const TASK_TYPES = ['clean', 'inspect', 'maintenance', 'linen', 'deep_clean']
const TASK_STATUSES = ['pending', 'in_progress', 'done', 'cancelled']
const PRIORITIES = ['low', 'medium', 'high']

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function statusColor(status) {
  if (status === 'done') return 'success.main'
  if (status === 'cancelled') return 'text.secondary'
  if (status === 'in_progress') return 'info.main'
  return 'warning.main'
}

function TaskDialog({ task = null, rooms, staff, onSave, onClose }) {
  const [form, setForm] = useState({
    roomId: task?.roomId ?? '',
    taskType: task?.taskType ?? 'clean',
    status: task?.status ?? 'pending',
    staffId: task?.staffId ?? '',
    priority: task?.priority ?? 'medium',
    notes: task?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.roomId) {
      setError('Room is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        roomId: Number(form.roomId),
        taskType: form.taskType,
        status: form.status,
        staffId: form.staffId ? Number(form.staffId) : null,
        priority: form.priority,
        notes: form.notes.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 400, maxWidth: 400 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {task ? 'Edit task' : 'New task'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Room</InputLabel>
          <Select
            label="Room"
            value={form.roomId}
            onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {rooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.roomNumber}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl variant="standard" size="small" sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Task type</InputLabel>
            <Select
              label="Task type"
              value={form.taskType}
              onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              {TASK_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="standard" size="small" sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Priority</InputLabel>
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Assign to</InputLabel>
          <Select
            label="Assign to"
            value={form.staffId}
            onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="">
              <em>Unassigned</em>
            </MenuItem>
            {staff.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
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
            {TASK_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          variant="standard"
          size="small"
          label="Notes"
          multiline
          minRows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          sx={inputSx}
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

function HousekeepingTasks() {
  const showToast = useToast()
  const [tasks, setTasks] = useState([])
  const [rooms, setRooms] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialog, setDialog] = useState({ open: false, task: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listHousekeepingTasks(), listRooms(), listStaff({ active: true })])
      .then(([taskRows, roomRows, staffRows]) => {
        if (active) {
          setTasks(taskRows)
          setRooms(roomRows)
          setStaff(staffRows)
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
    const [taskRows, roomRows, staffRows] = await Promise.all([
      listHousekeepingTasks(),
      listRooms(),
      listStaff({ active: true }),
    ])
    setTasks(taskRows)
    setRooms(roomRows)
    setStaff(staffRows)
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return tasks
    return tasks.filter((t) => t.status === statusFilter)
  }, [tasks, statusFilter])

  async function handleSave(data) {
    if (dialog.task) {
      await updateHousekeepingTask(dialog.task.id, data)
      showToast('Task updated')
    } else {
      await createHousekeepingTask(data)
      showToast('Task created')
    }
    setDialog({ open: false, task: null })
    await refresh()
  }

  async function handleSetStatus(task, status) {
    try {
      await updateHousekeepingTask(task.id, {
        roomId: task.roomId,
        taskType: task.taskType,
        status,
        staffId: task.staffId,
        priority: task.priority,
        notes: task.notes,
      })
      showToast(status === 'done' ? 'Task completed' : status === 'cancelled' ? 'Task cancelled' : 'Task started')
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteHousekeepingTask(confirmDelete.id)
      showToast('Task deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Task assignment
          </Typography>
          <FormControl variant="standard" size="small" sx={{ ml: 1, minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              <MenuItem value="all">All</MenuItem>
              {TASK_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, task: null })}
          >
            New Task
          </Button>
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
              <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Assigned</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{task.roomNumber}</TableCell>
                  <TableCell>
                    <Chip label={task.taskType} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#e0e7ff' }} />
                  </TableCell>
                  <TableCell>{task.priority}</TableCell>
                  <TableCell>
                    <Chip label={task.status} size="small" sx={{ height: 18, fontSize: '0.62rem', color: statusColor(task.status) }} />
                  </TableCell>
                  <TableCell>{task.staffName || '—'}</TableCell>
                  <TableCell>{task.notes || '—'}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {task.status === 'pending' && (
                        <IconButton size="small" title="Start" onClick={() => handleSetStatus(task, 'in_progress')}>
                          <PlayArrowIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      {task.status === 'in_progress' && (
                        <IconButton size="small" title="Complete" onClick={() => handleSetStatus(task, 'done')}>
                          <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      {(task.status === 'pending' || task.status === 'in_progress') && (
                        <IconButton size="small" title="Cancel" onClick={() => handleSetStatus(task, 'cancelled')}>
                          <CancelOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, task })}>
                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(task)}>
                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No tasks found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <TaskDialog
          task={dialog.task}
          rooms={rooms}
          staff={staff}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, task: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete task
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete this task? This cannot be undone.
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

export default HousekeepingTasks
