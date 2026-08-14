import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { listLocations, createLocation, updateLocation, deleteLocation } from '../../api/locations'
import { listStockLevels } from '../../api/stockLevels'
import { useToast } from '../../components/Toast'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function LocationDetailsDialog({ location, onClose }) {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    listStockLevels({ locationId: location.id })
      .then((rows) => {
        if (active) setLevels(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [location.id])

  const totalValue = levels.reduce((sum, row) => sum + (Number(row.stockValue) || 0), 0)

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            margin: 0,
            width: 560,
            maxWidth: 'calc(100% - 32px)',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {location.name}
            {location.isDefault && (
              <Chip label="Default" size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.62rem' }} />
            )}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'text.secondary', p: 0.25, '&:hover': { color: 'text.primary' } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, flex: '1 1 auto', overflowY: 'auto' }}>
        {location.description && (
          <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {location.description}
          </Typography>
        )}
        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '16%' }}>SKU</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '14%' }}>
                On hand
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Cost price
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Stock value
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 2, textAlign: 'center' }}>
                  <CircularProgress size={20} />
                </TableCell>
              </TableRow>
            ) : (
              levels.map((row) => (
                <TableRow key={row.itemId}>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.itemName}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{row.sku}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.onHand}
                  </TableCell>
                  <TableCell align="right">{money.format(row.costPrice)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money.format(row.stockValue)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && levels.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No items in this store yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
          {!loading && levels.length > 0 && (
            <TableFooter>
              <TableRow
                sx={{
                  '& .MuiTableCell-root': {
                    borderTop: '2px solid',
                    borderTopColor: 'text.primary',
                    borderBottom: 'none',
                  },
                }}
              >
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {money.format(totalValue)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function LocationDialog({ open, location, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({
        name: location?.name ?? '',
        description: location?.description ?? '',
      })
      setError('')
    }
  }, [open, location])

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: form.name.trim(), description: form.description.trim() || null })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            margin: 0,
            width: { xs: '100%', sm: 380 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100% )', sm: 380 },
            maxHeight: { xs: 'calc(100dvh)', sm: '88vh' },
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1 },
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {location ? 'Edit location' : 'New location'}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'text.secondary', p: 0.25, '&:hover': { color: 'text.primary' } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 1.5,
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        }}
      >
        <TextField
          variant="standard"
          size="small"
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          autoFocus
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          multiline
          minRows={2}
          sx={inputSx}
        />
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" disabled={saving} onClick={handleSubmit}>
          {location ? 'Save changes' : 'Create location'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function StockLocations() {
  const showToast = useToast()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [details, setDetails] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const refresh = useCallback(() => {
    setLoading(true)
    listLocations()
      .then((rows) => {
        setLocations(rows)
        setLoadError('')
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return locations
    return locations.filter(
      (loc) => loc.name.toLowerCase().includes(q) || (loc.description || '').toLowerCase().includes(q),
    )
  }, [locations, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  async function handleSave(data) {
    if (editing) {
      await updateLocation(editing.id, data)
      showToast('Location updated')
    } else {
      await createLocation(data)
      showToast('Location created')
    }
    refresh()
  }

  async function handleDelete() {
    try {
      await deleteLocation(confirmDelete.id)
      showToast('Location deleted')
      setConfirmDelete(null)
      refresh()
    } catch (err) {
      showToast(err.message, 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search locations"
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
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            New Location
          </Button>
        </Box>

        {loadError && (
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1, fontSize: '0.78rem' }}>
            {loadError}
          </Typography>
        )}

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
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Items stored
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((loc) => (
                <TableRow key={loc.id} hover onClick={() => setDetails(loc)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {loc.name}{' '}
                    {loc.isDefault && (
                      <Chip label="Default" size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.62rem' }} />
                    )}
                  </TableCell>
                  <TableCell
                    sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {loc.description || '—'}
                  </TableCell>
                  <TableCell align="right">{loc.itemCount}</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    <Stack direction="row" justifyContent="flex-end" sx={{ width: '100%' }}>
                      <IconButton
                        size="small"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing(loc)
                          setDialogOpen(true)
                        }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete(loc)
                        }}
                        disabled={loc.isDefault}
                      >
                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No locations found.</TableCell>
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
            '& .MuiTablePagination-selectIcon': { fontSize: 18 },
          }}
        />
      </CardContent>

      {dialogOpen && (
        <LocationDialog
          open={dialogOpen}
          location={editing}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
        />
      )}

      {details && <LocationDetailsDialog location={details} onClose={() => setDetails(null)} />}

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete location
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            Delete <b>{confirmDelete?.name}</b>? This only works if no stock movements or counts use it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default StockLocations
