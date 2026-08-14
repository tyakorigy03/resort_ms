import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto'
import CloseIcon from '@mui/icons-material/Close'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import { uploadImage } from '../api/items'
import { listPriceLists } from '../api/priceLists'
import { listAccountingGroups } from '../api/accountingGroups'
import { useToast } from './Toast'

const measureModes = {
  Units: ['Piece', 'Dozen', 'Box', 'Bag', 'Bottle', 'Pair'],
  Volume: ['Litre', 'Millilitre', 'Gallon'],
  Weight: ['Kilogram', 'Gram', 'Pound'],
  Length: ['Metre', 'Centimetre', 'Inch'],
}

function SupplierPickerDialog({ open, available, onAdd, onClose }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (open) setSelected([])
  }, [open])

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 300, maxWidth: 300 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Select suppliers
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5 }}>
        {available.length === 0 ? (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            All suppliers are already added.
          </Typography>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {available.map((s) => (
              <Box
                key={s.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <Checkbox
                  size="small"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  sx={{ p: 0.25 }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
                    {s.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                    {s.contact}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          disabled={selected.length === 0}
          onClick={() => onAdd(selected)}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ItemDetailDialog({ item = null, suppliers = [], onSave, onClose }) {
  const showToast = useToast()
  const [form, setForm] = useState({
    name: item?.name ?? '',
    sku: item?.sku ?? '',
    category: item?.category ?? '',
    measuredBy: item?.measuredBy ?? 'Units',
    unit: item?.unit ?? 'Bag',
    accountingGroup: item?.accountingGroup ?? '',
    description: item?.description ?? '',
    imageFile: null,
    imagePreview: item?.image ?? '',
  })
  const [supplierRows, setSupplierRows] = useState(item?.suppliers ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [accountingGroups, setAccountingGroups] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [priceRows, setPriceRows] = useState([])

  useEffect(() => {
    let active = true
    listAccountingGroups()
      .then((rows) => {
        if (active) setAccountingGroups(rows)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    listPriceLists()
      .then((rows) => {
        if (!active) return
        const existing = new Map((item?.prices ?? []).map((p) => [p.priceListId, String(p.price)]))
        setPriceLists(rows)
        setPriceRows(
          rows.map((list) => ({
            id: list.id,
            name: list.name,
            currency: list.currency,
            isDefault: list.isDefault,
            price: existing.get(list.id) ?? '',
          })),
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [item])

  const availableSuppliers = suppliers.filter(
    (s) => !supplierRows.some((row) => row.id === s.id)
  )

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function handleMeasuredBy(event) {
    const mode = event.target.value
    setForm((prev) => ({ ...prev, measuredBy: mode, unit: measureModes[mode][0] }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }))
    event.target.value = ''
  }

  function handleAddSuppliers(selectedIds) {
    const picked = suppliers.filter((s) => selectedIds.includes(s.id))
    setSupplierRows((prev) => [...prev, ...picked])
    setPickerOpen(false)
  }

  function removeSupplier(id) {
    setSupplierRows((prev) => prev.filter((s) => s.id !== id))
  }

  function handlePriceChange(priceListId) {
    return (event) => {
      const value = event.target.value
      setPriceRows((prev) => prev.map((r) => (r.id === priceListId ? { ...r, price: value } : r)))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      let image = form.imagePreview
      if (form.imageFile) {
        const uploaded = await uploadImage(form.imageFile)
        image = uploaded.url
      }
      const payload = { ...form }
      delete payload.imageFile
      const prices = priceRows
        .filter((r) => r.price !== '' && r.price !== null)
        .map((r) => ({ priceListId: r.id, price: Number(r.price) }))
      await onSave({ ...payload, image, supplierIds: supplierRows.map((s) => s.id), prices })
    } catch (err) {
      setError(err.message || 'Failed to save item')
      showToast(err.message || 'Failed to save item', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: {xs:0,sm:2},
            margin: 0,
            width: { xs: '100%', sm: 380 },
            height:{xs:'100vh',sm:'auto'},
            maxWidth: { xs: 'calc(100% )', sm: 380 },
            maxHeight: { xs: 'calc(100dvh)', sm: '88vh' },
            display: 'flex',
            flexDirection: 'column',
            p:{xs:1}
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {item ? 'Item details' : 'New item'}
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
          flex: '1 1 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 360,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              variant="standard"
              size="small"
              fullWidth
              label="Item name"
              value={form.name}
              onChange={handleChange('name')}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                variant="standard"
                size="small"
                label="SKU"
                value={form.sku}
                onChange={handleChange('sku')}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
              <TextField
                variant="standard"
                size="small"
                label="Category"
                value={form.category}
                onChange={handleChange('category')}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                variant="standard"
                size="small"
                label="Measured by"
                select
                value={form.measuredBy}
                onChange={handleMeasuredBy}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              >
                {Object.keys(measureModes).map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                variant="standard"
                size="small"
                label="Unit"
                select
                value={form.unit}
                onChange={handleChange('unit')}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
              >
                {measureModes[form.measuredBy].map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              variant="standard"
              size="small"
              label="Accounting group"
              select
              value={form.accountingGroup}
              onChange={handleChange('accountingGroup')}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
            >
              {accountingGroups.map((group) => (
                <MenuItem key={group.id} value={group.name}>
                  {group.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ position: 'relative', height: 100, borderRadius: 1, overflow: 'hidden' }}>
            {form.imagePreview ? (
              <img
                src={form.imagePreview}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.disabled',
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 26 }} />
              </Box>
            )}
            <IconButton
              size="small"
              component="label"
              sx={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                p: 0.5,
                width: 24,
                height: 24,
                '&:hover': { backgroundColor: 'primary.dark' },
              }}
            >
              <input hidden accept="image/*" type="file" onChange={handleImageChange} />
              <PhotoCameraIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
            Selling prices
          </Typography>
          {priceLists.length === 0 && (
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              No price lists yet
            </Typography>
          )}
        </Box>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
          {priceRows.map((row) => (
            <Box
              key={row.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 'none' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
                <Typography noWrap variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  {row.name}
                </Typography>
                {row.isDefault && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.58rem',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      px: 0.5,
                      borderRadius: 0.5,
                      lineHeight: 1.4,
                    }}
                  >
                    Main
                  </Typography>
                )}
              </Box>
              <TextField
                variant="standard"
                size="small"
                type="number"
                placeholder="0.00"
                value={row.price}
                onChange={handlePriceChange(row.id)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {row.currency || '$'}
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 110, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
              />
            </Box>
          ))}
        </Box>

        <TextField
          variant="standard"
          size="small"
          label="Description"
          value={form.description}
          onChange={handleChange('description')}
          multiline
          minRows={2}
          fullWidth
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
            Suppliers
          </Typography>
          <Button size="small" variant="contained" onClick={() => setPickerOpen(true)} startIcon={<AddIcon fontSize="small" />}>
            Add supplier
          </Button>
        </Box>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, width: '100%', overflowX: 'auto', flexShrink: 0 }}>
          <Table
            size="small"
            sx={{ tableLayout: 'fixed', width: '100%', '& .MuiTableCell-root': { py: 0.35, px: 0.6, fontSize: '0.65rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {supplierRows.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.contact}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => removeSupplier(s.id)} title="Remove">
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {supplierRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} sx={{ color: 'text.secondary' }}>
                    No suppliers assigned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', mr: 'auto', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>

      <SupplierPickerDialog
        open={pickerOpen}
        available={availableSuppliers}
        onAdd={handleAddSuppliers}
        onClose={() => setPickerOpen(false)}
      />
    </Dialog>
  )
}
