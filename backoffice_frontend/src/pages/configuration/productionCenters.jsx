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
import {
  createProductionCenter,
  deleteProductionCenter,
  listProductionCenters,
  updateProductionCenter,
} from '../../api/productionCenters'
import { listLocations } from '../../api/locations'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function CenterDialog({ center = null, locations, onSave, onClose }) {
  const [form, setForm] = useState({
    name: center?.name ?? '',
    code: center?.code ?? '',
    description: center?.description ?? '',
    locationId: center?.locationId ?? '',
    isActive: center?.isActive ?? true,
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
      await onSave({
        ...form,
        name: form.name.trim(),
        locationId: form.locationId ? Number(form.locationId) : null,
      })
    } catch (err) {
      setError(err.message || 'Failed to save production center')
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
            {center ? 'Edit production center' : 'New production center'}
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
          label="Description"
          multiline
          minRows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          sx={inputSx}
        />
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Stock location</InputLabel>
          <Select
            label="Stock location"
            value={form.locationId}
            onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="">
              <em>Default location</em>
            </MenuItem>
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
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

function ProductionCenters() {
  const showToast = useToast()
  const [centers, setCenters] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, center: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listProductionCenters(), listLocations()])
      .then(([rows, locationRows]) => {
        if (active) {
          setCenters(rows)
          setLocations(locationRows)
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
    const [rows, locationRows] = await Promise.all([listProductionCenters(), listLocations()])
    setCenters(rows)
    setLocations(locationRows)
  }

  async function handleSave(data) {
    if (dialog.center) {
      await updateProductionCenter(dialog.center.id, data)
      showToast('Production center updated')
    } else {
      await createProductionCenter(data)
      showToast('Production center created')
    }
    setDialog({ open: false, center: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteProductionCenter(confirmDelete.id)
      showToast('Production center deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete production center', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Production centers
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, center: null })}
          >
            New Center
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 620,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Center</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Stock location</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Groups</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : (
              centers.map((center) => (
                <TableRow key={center.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{center.name}</TableCell>
                  <TableCell>{center.code || '—'}</TableCell>
                  <TableCell>{center.description || '—'}</TableCell>
                  <TableCell>{center.locationName || 'Default'}</TableCell>
                  <TableCell>{center.groupCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={center.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: center.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, center })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(center)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && centers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No production centers yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <CenterDialog
          center={dialog.center}
          locations={locations}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, center: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete production center
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}"? Accounting groups that use it will lose the link.
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

export default ProductionCenters
