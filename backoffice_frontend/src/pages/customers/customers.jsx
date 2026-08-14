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
  FormControlLabel,
  IconButton,
  InputAdornment,
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
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from '../../api/customers'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function CustomerDialog({ customer = null, onSave, onClose }) {
  const [form, setForm] = useState({
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    notes: customer?.notes ?? '',
    isActive: customer?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      })
    } catch (err) {
      setError(err.message || 'Failed to save customer')
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
            {customer ? 'Edit customer' : 'New customer'}
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
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            sx={inputSx}
          />
          <TextField
            variant="standard"
            size="small"
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            sx={inputSx}
          />
        </Box>
        <TextField
          variant="standard"
          size="small"
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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

function Customers() {
  const showToast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState({ open: false, customer: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const refresh = useCallback(() => {
    setLoading(true)
    listCustomers()
      .then((rows) => setCustomers(rows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q),
    )
  }, [customers, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  async function handleSave(data) {
    if (dialog.customer) {
      await updateCustomer(dialog.customer.id, data)
      showToast('Customer updated')
    } else {
      await createCustomer(data)
      showToast('Customer created')
    }
    setDialog({ open: false, customer: null })
    refresh()
  }

  async function handleDelete() {
    try {
      await deleteCustomer(confirmDelete.id)
      showToast('Customer deleted')
      setConfirmDelete(null)
      refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete customer', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search customers"
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
            onClick={() => setDialog({ open: true, customer: null })}
          >
            New Customer
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
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
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
              paged.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {c.firstName} {c.lastName}
                    {c.notes && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem' }}>
                        {c.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{c.email || '—'}</TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={c.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        color: c.isActive ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, customer: c })}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(c)}>
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No customers found.</TableCell>
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
        <CustomerDialog
          customer={dialog.customer}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, customer: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete customer
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.firstName} {confirmDelete?.lastName}"? This cannot be undone.
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

export default Customers
