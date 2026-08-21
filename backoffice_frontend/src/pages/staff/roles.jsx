import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  FormControl,
  OutlinedInput,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ShieldIcon from '@mui/icons-material/Shield'
import {
  createRole,
  deleteRole,
  listRolesDetailed,
  updateRole,
  setRolePermissions,
} from '../../api/staff'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

const ALL_PERMISSIONS = [
  'sale_period.open',
  'sale_period.close',
  'pos.order',
  'pos.refund',
  'pos.void',
  'inventory.view',
  'inventory.edit',
  'housekeeping.view',
  'housekeeping.edit',
  'reservations.view',
  'reservations.edit',
  'staff.view',
  'staff.edit',
  'reports.view',
  'configuration.edit',
]

function RoleDialog({ role = null, onSave, onClose }) {
  const [form, setForm] = useState({
    name: role?.name ?? '',
    description: role?.description ?? '',
  })
  const [permissions, setPermissions] = useState(role?.permissions ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Role name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await onSave({ name: form.name.trim(), description: form.description.trim() || null })
      if (saved?.id) {
        await setRolePermissions(saved.id, permissions)
      }
    } catch (err) {
      setError(err.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  function togglePerm(perm) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 480, maxWidth: 480 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {role ? 'Edit role' : 'New role'}
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
          label="Role name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          sx={inputSx}
        />

        <Divider sx={{ my: 0.5 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Permissions
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 240, overflowY: 'auto' }}>
          {ALL_PERMISSIONS.map((perm) => (
            <FormControlLabel
              key={perm}
              control={
                <Switch
                  size="small"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePerm(perm)}
                />
              }
              label={perm}
              sx={{ mx: 0, py: 0.25, '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
            />
          ))}
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

function Roles() {
  const showToast = useToast()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState({ open: false, role: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const refresh = useCallback(() => {
    setLoading(true)
    listRolesDetailed()
      .then((rows) => setRoles(rows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q),
    )
  }, [roles, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  async function handleSave(data) {
    let saved
    if (dialog.role) {
      saved = await updateRole(dialog.role.id, data)
      showToast('Role updated')
    } else {
      saved = await createRole(data)
      showToast('Role created')
    }
    setDialog({ open: false, role: null })
    refresh()
    return saved
  }

  async function handleDelete() {
    try {
      await deleteRole(confirmDelete.id)
      showToast('Role deleted')
      setConfirmDelete(null)
      refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete role', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search roles"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, role: null })}
          >
            New Role
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 600,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Permissions</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((role) => (
                <TableRow
                  key={role.id}
                  hover
                  onClick={() => setDialog({ open: true, role })}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <ShieldIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      {role.name}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{role.description || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(role.permissions || []).slice(0, 3).map((p) => (
                        <Chip key={p} label={p} size="small" sx={{ height: 18, fontSize: '0.58rem', bgcolor: '#e0f2fe' }} />
                      ))}
                      {(role.permissions || []).length > 3 && (
                        <Chip
                          label={`+${role.permissions.length - 3}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.58rem', bgcolor: '#f3f4f6' }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDialog({ open: true, role })
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(role)
                      }}
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No roles found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{
            '& .MuiTablePagination-toolbar': { minHeight: 36 },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select': {
              fontSize: '0.7rem',
            },
          }}
        />
      </CardContent>

      {dialog.open && (
        <RoleDialog
          role={dialog.role}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, role: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete role
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}"? Staff assigned to this role will lose its permissions.
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

export default Roles
