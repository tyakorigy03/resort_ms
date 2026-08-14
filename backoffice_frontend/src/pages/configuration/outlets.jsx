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
  FormControlLabel,
  IconButton,
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
import {
  createOutlet,
  deleteOutlet,
  listOutlets,
  updateOutlet,
} from '../../api/outlets'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function OutletDialog({ outlet = null, onSave, onClose }) {
  const [form, setForm] = useState({
    name: outlet?.name ?? '',
    code: outlet?.code ?? '',
    address: outlet?.address ?? '',
    phone: outlet?.phone ?? '',
    isActive: outlet?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, name: form.name.trim() })
    } catch (err) {
      setError(err.message || 'Failed to save outlet')
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
            {outlet ? 'Edit outlet' : 'New outlet'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          autoFocus
          variant="standard"
          size="small"
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Code"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Address"
          multiline
          minRows={2}
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          sx={inputSx}
        />
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

function Outlets() {
  const showToast = useToast()
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, outlet: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    listOutlets()
      .then((rows) => {
        if (active) setOutlets(rows)
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
    setOutlets(await listOutlets())
  }

  async function handleSave(data) {
    if (dialog.outlet) {
      await updateOutlet(dialog.outlet.id, data)
      showToast('Outlet updated')
    } else {
      await createOutlet(data)
      showToast('Outlet created')
    }
    setDialog({ open: false, outlet: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteOutlet(confirmDelete.id)
      showToast('Outlet deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete outlet', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Outlets
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, outlet: null })}
          >
            New Outlet
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 520,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Outlet</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Devices</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              outlets.map((outlet) => (
                <TableRow key={outlet.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {outlet.name}
                    {outlet.address && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem' }}>
                        {outlet.address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{outlet.code || '—'}</TableCell>
                  <TableCell>{outlet.phone || '—'}</TableCell>
                  <TableCell>{outlet.deviceCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={outlet.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: outlet.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, outlet })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(outlet)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && outlets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No outlets yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <OutletDialog
          outlet={dialog.outlet}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, outlet: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete outlet
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}"? Devices assigned to it will keep working but become unassigned.
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

export default Outlets
