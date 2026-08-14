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
  createRatePlan,
  deleteRatePlan,
  listRatePlans,
  updateRatePlan,
} from '../../api/ratePlans'
import { listRoomTypes } from '../../api/roomTypes'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function RatePlanDialog({ plan = null, roomTypes, onSave, onClose }) {
  const initialRates = {}
  for (const t of roomTypes) {
    const existing = plan?.rates?.find((r) => r.roomTypeId === t.id)
    initialRates[t.id] = existing ? existing.rate : t.baseRate
  }
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    code: plan?.code ?? '',
    description: plan?.description ?? '',
    isActive: plan?.isActive ?? true,
  })
  const [rates, setRates] = useState(initialRates)
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
      const ratesPayload = roomTypes.map((t) => ({
        roomTypeId: t.id,
        rate: Number(rates[t.id]) || 0,
      }))
      await onSave({
        ...form,
        name: form.name.trim(),
        rates: ratesPayload,
      })
    } catch (err) {
      setError(err.message || 'Failed to save rate plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 460, maxWidth: 460 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {plan ? 'Edit rate plan' : 'New rate plan'}
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
        </Box>
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

        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.5 }}>
          Rates per room type
        </Typography>
        <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.3, px: 0.5, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Room type</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Rate
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roomTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell align="right">
                    <TextField
                      variant="standard"
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      value={rates[t.id] ?? 0}
                      onChange={(e) => setRates((r) => ({ ...r, [t.id]: e.target.value }))}
                      sx={{
                        width: 90,
                        '& .MuiInputBase-input': { fontSize: '0.75rem', textAlign: 'right' },
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
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

function RatePlans() {
  const showToast = useToast()
  const [plans, setPlans] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, plan: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listRatePlans(), listRoomTypes()])
      .then(([planRows, typeRows]) => {
        if (active) {
          setPlans(planRows)
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
    const [planRows, typeRows] = await Promise.all([listRatePlans(), listRoomTypes()])
    setPlans(planRows)
    setRoomTypes(typeRows)
  }

  async function handleSave(data) {
    if (dialog.plan) {
      await updateRatePlan(dialog.plan.id, data)
      showToast('Rate plan updated')
    } else {
      await createRatePlan(data)
      showToast('Rate plan created')
    }
    setDialog({ open: false, plan: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteRatePlan(confirmDelete.id)
      showToast('Rate plan deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete rate plan', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Rate plans
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, plan: null })}
          >
            New Plan
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 560,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Rates</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {plan.name}
                    {plan.description && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem' }}>
                        {plan.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{plan.code || '—'}</TableCell>
                  <TableCell>
                    {plan.rates.length === 0 ? (
                      '—'
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {plan.rates.slice(0, 4).map((r) => (
                          <Chip
                            key={r.roomTypeId}
                            label={`${r.roomTypeName}: $${r.rate}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        ))}
                        {plan.rates.length > 4 && (
                          <Chip label={`+${plan.rates.length - 4}`} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={plan.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: plan.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, plan })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(plan)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && plans.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No rate plans yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <RatePlanDialog
          plan={dialog.plan}
          roomTypes={roomTypes}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, plan: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete rate plan
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

export default RatePlans
