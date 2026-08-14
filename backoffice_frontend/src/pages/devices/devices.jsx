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
import KeyIcon from '@mui/icons-material/Key'
import { createDevice, deleteDevice, listDevices, setDevicePin, updateDevice } from '../../api/devices'
import { listOutlets } from '../../api/outlets'
import { listProductionCenters } from '../../api/productionCenters'
import { useToast } from '../../components/Toast'

const DEVICE_TYPES = ['pos', 'kds', 'printer', 'tablet', 'cash_drawer', 'other']

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function DeviceDialog({ device = null, outlets, productionCenters, onSave, onClose }) {
  const [form, setForm] = useState({
    name: device?.name ?? '',
    deviceType: device?.deviceType ?? 'pos',
    code: device?.code ?? '',
    outletId: device?.outletId ?? '',
    productionCenterId: device?.productionCenterId ?? '',
    ipAddress: device?.ipAddress ?? '',
    config: device?.config ? JSON.stringify(device.config, null, 2) : '',
    isActive: device?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    let config = null
    if (form.config.trim()) {
      try {
        config = JSON.parse(form.config)
      } catch {
        setError('Config must be valid JSON')
        return
      }
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: form.name.trim(),
        deviceType: form.deviceType,
        code: form.code.trim() || null,
        outletId: form.outletId ? Number(form.outletId) : null,
        productionCenterId: form.productionCenterId ? Number(form.productionCenterId) : null,
        ipAddress: form.ipAddress.trim() || null,
        config,
        isActive: form.isActive,
      })
    } catch (err) {
      setError(err.message || 'Failed to save device')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 420, maxWidth: 420 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {device ? 'Edit device' : 'New device'}
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
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Device type</InputLabel>
          <Select
            label="Device type"
            value={form.deviceType}
            onChange={(e) => setForm((f) => ({ ...f, deviceType: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {DEVICE_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          variant="standard"
          size="small"
          label="Code"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          sx={inputSx}
        />
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Outlet</InputLabel>
          <Select
            label="Outlet"
            value={form.outletId}
            onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="">
              <em>No outlet</em>
            </MenuItem>
            {outlets.map((outlet) => (
              <MenuItem key={outlet.id} value={outlet.id}>
                {outlet.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Production center</InputLabel>
          <Select
            label="Production center"
            value={form.productionCenterId}
            onChange={(e) => setForm((f) => ({ ...f, productionCenterId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="">
              <em>No production center</em>
            </MenuItem>
            {productionCenters.map((pc) => (
              <MenuItem key={pc.id} value={pc.id}>
                {pc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          variant="standard"
          size="small"
          label="IP address"
          value={form.ipAddress}
          onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Config (JSON)"
          multiline
          minRows={3}
          value={form.config}
          onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))}
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

function DevicePinDialog({ device, onClose }) {
  const showToast = useToast()
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!/^\d{4}$/.test(pin.trim())) {
      setError('PIN must be exactly 4 digits')
      return
    }
    setSaving(true)
    setError('')
    try {
      await setDevicePin(device.id, pin.trim())
      showToast('Device PIN saved')
      onClose(true)
    } catch (err) {
      setError(err.message || 'Failed to save PIN')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => onClose(false)}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            POS login PIN — {device.name}
          </Typography>
          <IconButton onClick={() => onClose(false)} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
          {device.hasPin ? 'A PIN is currently set. Enter a new one to replace it.' : 'No PIN set yet — the device cannot log in until this is set.'}
        </Typography>
        <TextField
          variant="standard"
          size="small"
          label="PIN (4 digits)"
          type="password"
          inputProps={{ maxLength: 6 }}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
          sx={inputSx}
        />
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Save PIN
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Devices() {
  const showToast = useToast()
  const [devices, setDevices] = useState([])
  const [outlets, setOutlets] = useState([])
  const [productionCenters, setProductionCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, device: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pinFor, setPinFor] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listDevices(), listOutlets(), listProductionCenters()])
      .then(([rows, outletRows, centerRows]) => {
        if (active) {
          setDevices(rows)
          setOutlets(outletRows)
          setProductionCenters(centerRows)
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
    const [rows, outletRows, centerRows] = await Promise.all([
      listDevices(),
      listOutlets(),
      listProductionCenters(),
    ])
    setDevices(rows)
    setOutlets(outletRows)
    setProductionCenters(centerRows)
  }

  async function handleSave(data) {
    if (dialog.device) {
      await updateDevice(dialog.device.id, data)
      showToast('Device updated')
    } else {
      await createDevice(data)
      showToast('Device created')
    }
    setDialog({ open: false, device: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteDevice(confirmDelete.id)
      showToast('Device deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete device', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Devices
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, device: null })}
          >
            New Device
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
              <TableCell sx={{ fontWeight: 600 }}>Device</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Outlet</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Production center</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>IP</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : (
              devices.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{device.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={device.deviceType}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#e0e7ff' }}
                    />
                  </TableCell>
                  <TableCell>{device.code || '—'}</TableCell>
                  <TableCell>{device.outletName || '—'}</TableCell>
                  <TableCell>{device.productionCenterName || '—'}</TableCell>
                  <TableCell>{device.ipAddress || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={device.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: device.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title={device.hasPin ? 'PIN set' : 'No PIN — set login PIN'}
                      onClick={() => setPinFor(device)}
                      sx={{ color: device.hasPin ? 'success.main' : 'text.disabled' }}
                    >
                      <KeyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, device })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(device)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>No devices yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <DeviceDialog
          device={dialog.device}
          outlets={outlets}
          productionCenters={productionCenters}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, device: null })}
        />
      )}

      {pinFor && (
        <DevicePinDialog
          device={pinFor}
          onClose={(changed) => {
            setPinFor(null)
            if (changed) refresh()
          }}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete device
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}"? This cannot be undone.
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

export default Devices
