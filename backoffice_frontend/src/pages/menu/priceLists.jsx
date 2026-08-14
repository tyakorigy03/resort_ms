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
  IconButton,
  InputAdornment,
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
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import StarOutlinedIcon from '@mui/icons-material/StarOutlined'
import {
  createPriceList,
  deletePriceList,
  listPriceLists,
  setDefaultPriceList,
  setPriceListItems,
  updatePriceList,
} from '../../api/priceLists'
import { listItems } from '../../api/items'
import { useToast } from '../../components/Toast'

function ListDialog({ list = null, onSave, onClose }) {
  const [name, setName] = useState(list?.name ?? '')
  const [currency, setCurrency] = useState(list?.currency ?? 'USD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), currency: currency.trim() || 'USD' })
    } catch (err) {
      setError(err.message || 'Failed to save price list')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 320, maxWidth: 320 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {list ? 'Edit price list' : 'New price list'}
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
          label="List name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
        />
        <TextField
          variant="standard"
          size="small"
          fullWidth
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
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

function PriceLists() {
  const showToast = useToast()
  const [lists, setLists] = useState([])
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState({ open: false, list: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listPriceLists(), listItems()])
      .then(([listRows, itemRows]) => {
        if (!active) return
        setLists(listRows)
        setItems(itemRows)
        if (listRows.length > 0) setSelectedId(listRows[0].id)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const map = {}
    for (const item of items) {
      const price = item.prices?.find((p) => p.priceListId === selectedId)
      map[item.id] = price ? String(price.price) : ''
    }
    setEdits(map)
  }, [selectedId, items])

  const selectedList = lists.find((l) => l.id === selectedId)

  async function refreshLists() {
    const rows = await listPriceLists()
    setLists(rows)
  }

  function handleEditChange(itemId) {
    return (event) => setEdits((prev) => ({ ...prev, [itemId]: event.target.value }))
  }

  async function handleSavePrices() {
    if (!selectedId) return
    setSaving(true)
    try {
      const prices = Object.entries(edits)
        .filter(([, price]) => price !== '' && price !== null)
        .map(([itemId, price]) => ({ itemId: Number(itemId), price: Number(price) }))
      await setPriceListItems(selectedId, prices)
      const rows = await listItems()
      setItems(rows)
      showToast('Prices saved')
    } catch (err) {
      showToast(err.message || 'Failed to save prices', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveList(data) {
    if (dialog.list) {
      await updatePriceList(dialog.list.id, data)
      showToast('Price list updated')
    } else {
      await createPriceList(data)
      showToast('Price list created')
    }
    setDialog({ open: false, list: null })
    await refreshLists()
  }

  async function handleSetDefault() {
    if (!selectedId) return
    try {
      await setDefaultPriceList(selectedId)
      showToast('Default price list updated')
      await refreshLists()
    } catch (err) {
      showToast(err.message || 'Failed to update default', 'error')
    }
  }

  async function handleDelete() {
    try {
      await deletePriceList(confirmDelete.id)
      showToast('Price list deleted')
      setConfirmDelete(null)
      await refreshLists()
      if (selectedId === confirmDelete.id && lists.length > 0) {
        const remaining = lists.filter((l) => l.id !== confirmDelete.id)
        setSelectedId(remaining[0]?.id ?? null)
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete price list', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Price lists
        </Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialog({ open: true, list: null })}>
          New Price List
        </Button>
      </Box>

      <Box sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: '280px 1fr' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {loading ? (
            <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
              Loading...
            </Typography>
          ) : (
            lists.map((list) => (
              <Card
                key={list.id}
                variant="outlined"
                onClick={() => setSelectedId(list.id)}
                sx={{
                  cursor: 'pointer',
                  borderColor: selectedId === list.id ? 'primary.main' : 'divider',
                  bgcolor: selectedId === list.id ? 'primary.main' : 'background.paper',
                  color: selectedId === list.id ? 'primary.contrastText' : 'inherit',
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {list.name}
                    </Typography>
                    {list.isDefault && (
                      <Chip
                        size="small"
                        label="Main"
                        icon={<StarOutlinedIcon />}
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          bgcolor: selectedId === list.id ? 'rgba(255,255,255,0.2)' : 'primary.main',
                          color: selectedId === list.id ? '#fff' : 'primary.contrastText',
                          '& .MuiChip-icon': { fontSize: 12 },
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                    {list.itemCount} item(s) · {list.currency}
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
          {!loading && lists.length === 0 && (
            <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
              No price lists yet.
            </Typography>
          )}
        </Box>

        {selectedList && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {selectedList.name}
                  </Typography>
                  {!selectedList.isDefault && (
                    <Button size="small" onClick={handleSetDefault} startIcon={<StarOutlinedIcon sx={{ fontSize: 15 }} />}>
                      Make main
                    </Button>
                  )}
                  <IconButton size="small" title="Edit" onClick={() => setDialog({ open: true, list: selectedList })}>
                    <EditOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(selectedList)}>
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveOutlinedIcon fontSize="small" />}
                  onClick={handleSavePrices}
                  disabled={saving}
                >
                  Save
                </Button>
              </Box>

              <Table
                size="small"
                sx={{
                  tableLayout: 'fixed',
                  minWidth: 300,
                  '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell align="right">
                        <TextField
                          variant="standard"
                          size="small"
                          type="number"
                          placeholder="0.00"
                          value={edits[item.id] ?? ''}
                          onChange={handleEditChange(item.id)}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                    {selectedList.currency === 'USD' ? '$' : selectedList.currency}
                                  </Typography>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={{ width: 130, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>No items yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Box>

      {dialog.open && (
        <ListDialog
          list={dialog.list}
          onSave={handleSaveList}
          onClose={() => setDialog({ open: false, list: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete price list
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}" and its item prices? This cannot be undone.
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
    </Box>
  )
}

export default PriceLists
