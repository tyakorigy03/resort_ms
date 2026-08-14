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
import StarIcon from '@mui/icons-material/Star'
import {
  createTaxProfile,
  deleteTaxProfile,
  listTaxProfiles,
  updateTaxProfile,
} from '../../api/taxProfiles'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function TaxProfileDialog({ profile = null, onSave, onClose }) {
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    rate: profile?.rate ?? 0,
    taxType: profile?.taxType ?? 'inclusive',
    isDefault: profile?.isDefault ?? false,
    isActive: profile?.isActive ?? true,
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
      await onSave({ ...form, name: form.name.trim(), rate: Number(form.rate) || 0 })
    } catch (err) {
      setError(err.message || 'Failed to save tax profile')
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
            {profile ? 'Edit tax profile' : 'New tax profile'}
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
          label="Rate (%)"
          type="number"
          inputProps={{ min: 0, max: 100, step: 0.01 }}
          value={form.rate}
          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
          sx={inputSx}
        />
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Tax type</InputLabel>
          <Select
            label="Tax type"
            value={form.taxType}
            onChange={(e) => setForm((f) => ({ ...f, taxType: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="inclusive">Inclusive (in price)</MenuItem>
            <MenuItem value="exclusive">Exclusive (added on top)</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
          }
          label="Default profile"
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }}
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

function TaxProfiles() {
  const showToast = useToast()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, profile: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    listTaxProfiles()
      .then((rows) => {
        if (active) setProfiles(rows)
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
    setProfiles(await listTaxProfiles())
  }

  async function handleSave(data) {
    if (dialog.profile) {
      await updateTaxProfile(dialog.profile.id, data)
      showToast('Tax profile updated')
    } else {
      await createTaxProfile(data)
      showToast('Tax profile created')
    }
    setDialog({ open: false, profile: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteTaxProfile(confirmDelete.id)
      showToast('Tax profile deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete tax profile', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Tax profiles
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, profile: null })}
          >
            New Profile
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 480,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Rate</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
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
              profiles.map((profile) => (
                <TableRow key={profile.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {profile.name}
                    {profile.isDefault && (
                      <Chip
                        icon={<StarIcon sx={{ fontSize: 11 }} />}
                        label="Default"
                        size="small"
                        sx={{ ml: 0.5, height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{profile.rate}%</TableCell>
                  <TableCell>
                    <Chip
                      label={profile.taxType}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', bgcolor: profile.taxType === 'inclusive' ? '#e0e7ff' : '#f3f4f6' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={profile.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: profile.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, profile })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(profile)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No tax profiles yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <TaxProfileDialog
          profile={dialog.profile}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, profile: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete tax profile
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

export default TaxProfiles
