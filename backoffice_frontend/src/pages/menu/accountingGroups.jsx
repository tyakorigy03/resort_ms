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
import {
  createAccountingGroup,
  deleteAccountingGroup,
  listAccountingGroups,
  updateAccountingGroup,
} from '../../api/accountingGroups'
import { listTaxProfiles } from '../../api/taxProfiles'
import { listProductionCenters } from '../../api/productionCenters'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function GroupDialog({ group = null, taxProfiles, centers, onSave, onClose }) {
  const [form, setForm] = useState({
    name: group?.name ?? '',
    taxProfileId: group?.taxProfileId ?? '',
    productionCenterIds: group?.productionCenters?.map((c) => c.id) ?? [],
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
        name: form.name.trim(),
        taxProfileId: form.taxProfileId ? Number(form.taxProfileId) : null,
        productionCenterIds: form.productionCenterIds.map((id) => Number(id)),
      })
    } catch (err) {
      setError(err.message || 'Failed to save group')
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
            {group ? 'Edit group' : 'New group'}
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
          fullWidth
          label="Group name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          sx={inputSx}
        />
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Tax profile</InputLabel>
          <Select
            label="Tax profile"
            value={form.taxProfileId}
            onChange={(e) => setForm((f) => ({ ...f, taxProfileId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="">
              <em>No tax profile</em>
            </MenuItem>
            {taxProfiles.map((tp) => (
              <MenuItem key={tp.id} value={tp.id}>
                {tp.name} ({tp.rate}%)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Production centers</InputLabel>
          <Select
            label="Production centers"
            multiple
            value={form.productionCenterIds}
            onChange={(e) => setForm((f) => ({ ...f, productionCenterIds: e.target.value }))}
            renderValue={(selected) =>
              selected.length === 0 ? (
                <em>No production centers</em>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {centers
                    .filter((c) => selected.includes(c.id))
                    .map((c) => (
                      <Chip key={c.id} label={c.name} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                    ))}
                </Box>
              )
            }
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {centers.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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

function AccountingGroups() {
  const showToast = useToast()
  const [groups, setGroups] = useState([])
  const [taxProfiles, setTaxProfiles] = useState([])
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, group: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listAccountingGroups(), listTaxProfiles(), listProductionCenters()])
      .then(([groupRows, taxRows, centerRows]) => {
        if (active) {
          setGroups(groupRows)
          setTaxProfiles(taxRows)
          setCenters(centerRows)
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
    const [groupRows, taxRows, centerRows] = await Promise.all([
      listAccountingGroups(),
      listTaxProfiles(),
      listProductionCenters(),
    ])
    setGroups(groupRows)
    setTaxProfiles(taxRows)
    setCenters(centerRows)
  }

  async function handleSave(data) {
    if (dialog.group) {
      await updateAccountingGroup(dialog.group.id, data)
      showToast('Group updated')
    } else {
      await createAccountingGroup(data)
      showToast('Group created')
    }
    setDialog({ open: false, group: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteAccountingGroup(confirmDelete.id)
      showToast('Group deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete group', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Accounting groups
          </Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialog({ open: true, group: null })}>
            New Group
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
              <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Tax profile</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Production centers</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{group.name}</TableCell>
                  <TableCell>{group.itemCount}</TableCell>
                  <TableCell>{group.taxProfileName || '—'}</TableCell>
                  <TableCell>
                    {group.productionCenters.length === 0 ? (
                      '—'
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.productionCenters.map((c) => (
                          <Chip key={c.id} label={c.name} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Edit"
                      onClick={() => setDialog({ open: true, group })}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Delete"
                      onClick={() => setConfirmDelete(group)}
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No groups yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <GroupDialog
          group={dialog.group}
          taxProfiles={taxProfiles}
          centers={centers}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, group: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete group
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

export default AccountingGroups
