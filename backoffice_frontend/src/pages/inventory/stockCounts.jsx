import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
import RemoveIcon from '@mui/icons-material/Remove'
import SearchIcon from '@mui/icons-material/Search'
import { listItems } from '../../api/items'
import { createStockCount, listStockCounts } from '../../api/stockCounts'
import { listStockLevels } from '../../api/stockLevels'
import { listLocations } from '../../api/locations'
import { listUsers } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatMoney(value) {
  return money.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function varianceColor(value) {
  if (value < 0) return 'error.main'
  if (value > 0) return 'success.main'
  return 'text.secondary'
}

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function StepperInput({ value, onChange }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <IconButton
        size="small"
        aria-label="decrease"
        onClick={() => onChange(String((Number(value) || 0) - 1))}
        sx={{ p: 0.3, borderRadius: 0 }}
      >
        <RemoveIcon sx={{ fontSize: 13 }} />
      </IconButton>
      <TextField
        variant="standard"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          '& .MuiInputBase-input': { fontSize: '0.78rem', textAlign: 'center', width: 44, py: 0.3 },
          '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
        }}
      />
      <IconButton
        size="small"
        aria-label="increase"
        onClick={() => onChange(String((Number(value) || 0) + 1))}
        sx={{ p: 0.3, borderRadius: 0 }}
      >
        <AddIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  )
}

function NewCountDialog({ items, locations = [], users = [], defaultStaff, onSave, onClose }) {
  const keyRef = useRef(0)
  const highlightedRef = useRef(null)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [levels, setLevels] = useState([])
  const levelById = useMemo(() => new Map(levels.map((l) => [l.itemId, l.onHand])), [levels])
  const [form, setForm] = useState({
    countDate: new Date().toISOString().slice(0, 10),
    staff: defaultStaff,
    notes: '',
  })
  const [lines, setLines] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // On-hand per item comes from the SELECTED location's ledger balance.
  useEffect(() => {
    if (!selectedLocation) {
      setLevels([])
      setLines([])
      return
    }
    let active = true
    listStockLevels({ locationId: selectedLocation })
      .then((rows) => {
        if (active) {
          setLevels(rows)
          setLines([])
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [selectedLocation])

  const selectedLocationName =
    locations.find((loc) => loc.id === Number(selectedLocation))?.name ?? ''
  const selectedStaffName =
    users.find((u) => u.id === Number(form.staff))?.name ?? ''

  const usedIds = new Set(lines.map((line) => line.itemId))
  const availableItems = items.filter((item) => !usedIds.has(item.id))

  function onHandFor(line) {
    return levelById.get(line.itemId) ?? 0
  }

  function varianceFor(line) {
    return (Number(line.countedQty) || 0) - onHandFor(line)
  }

  function addItem(option) {
    setLines((prev) => [
      ...prev,
      { key: ++keyRef.current, itemId: option.id, itemName: option.name, sku: option.sku, countedQty: '' },
    ])
    setInputValue('')
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter') return
    if (highlightedRef.current) return
    event.preventDefault()
    const q = inputValue.trim().toLowerCase()
    const match = availableItems.find(
      (item) => item.name.toLowerCase() === q || item.sku.toLowerCase() === q,
    )
    if (match) addItem(match)
  }

  function updateCounted(key, value) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, countedQty: value } : line)))
  }

  function removeLine(key) {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const filled = lines.filter((line) => line.countedQty !== '')
  const totalCounted = filled.reduce((sum, line) => sum + (Number(line.countedQty) || 0), 0)
  const totalVariance = filled.reduce((sum, line) => sum + varianceFor(line), 0)
  const canReview = form.staff && selectedLocation && filled.length > 0

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onSave({
        countDate: form.countDate,
        staff: selectedStaffName,
        notes: form.notes || null,
        locationId: Number(selectedLocation),
        items: filled.map((line) => ({
          itemId: Number(line.itemId),
          countedQty: Number(line.countedQty) || 0,
        })),
      })
    } catch (err) {
      setError(err.message || 'Failed to save stock count')
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
            borderRadius: { xs: 0, sm: 2 },
            margin: 0,
            width: { xs: '100%', sm: 500 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100%)', sm: 500 },
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
            New stock count
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
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <TextField
            variant="standard"
            size="small"
            type="date"
            label="Entry date"
            value={form.countDate}
            onChange={handleChange('countDate')}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={inputSx}
          />
          <FormControl variant="standard" size="small" sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Staff</InputLabel>
            <Select
              label="Staff"
              value={form.staff}
              onChange={handleChange('staff')}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Location</InputLabel>
          <Select
            label="Location"
            value={selectedLocation}
            onChange={(event) => setSelectedLocation(event.target.value)}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedLocation && (
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
            System stock and variance compare against <b>{selectedLocationName}</b> for this count.
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }}>
            Items
          </Typography>
          <Autocomplete
            size="small"
            options={availableItems}
            getOptionLabel={(option) => (option.sku ? `${option.name} (${option.sku})` : option.name)}
            value={null}
            inputValue={inputValue}
            onInputChange={(_, value) => setInputValue(value)}
            onChange={(_, option) => {
              if (option) addItem(option)
            }}
            onHighlightChange={(_, option) => {
              highlightedRef.current = option
            }}
            onKeyDown={handleKeyDown}
            blurOnSelect
            clearOnBlur
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Type or pick an item, press Enter"
                sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem', py: 0.7 } }}
              />
            )}
            sx={{ flex: 1, minWidth: 0 }}
          />
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' },
          }}
        >
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { borderBottomColor: 'text.primary' } }}>
              <TableCell sx={{ fontWeight: 600, width: '40%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '33%' }}>
                Counted
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '20%' }}>
                Variance
              </TableCell>
              <TableCell sx={{ width: 32 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                  No items yet — pick one above.
                </TableCell>
              </TableRow>
            )}
            {lines.map((line) => {
              const variance = varianceFor(line)
              return (
                <TableRow key={line.key}>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.itemName}
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.2 }}
                    >
                      On hand: {onHandFor(line)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <StepperInput value={line.countedQty} onChange={(value) => updateCounted(line.key, value)} />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: varianceColor(variance),
                    }}
                  >
                    {variance > 0 ? '+' : ''}
                    {variance}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => removeLine(line.key)} title="Remove line">
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          {lines.length > 0 && (
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
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Total counted
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {totalCounted}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: varianceColor(totalVariance) }}
                >
                  {totalVariance > 0 ? '+' : ''}
                  {totalVariance}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>

        <TextField
          variant="standard"
          size="small"
          label="Notes"
          value={form.notes}
          onChange={handleChange('notes')}
          multiline
          minRows={2}
          sx={inputSx}
        />
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
        <Button size="small" variant="contained" color="primary" disabled={saving || !canReview} onClick={() => setPreviewOpen(true)}>
          Review
        </Button>
      </DialogActions>

      <Dialog open={previewOpen} onClose={() => !saving && setPreviewOpen(false)}>
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Confirm stock count
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Date:</b> {formatDate(form.countDate)}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Staff:</b> {selectedStaffName}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Location:</b> {selectedLocationName}
            </Typography>
          </Box>
          <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '45%' }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '30%' }}>
                  Counted
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '25%' }}>
                  Variance
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filled.map((line) => {
                const counted = Number(line.countedQty) || 0
                const variance = varianceFor(line)
                return (
                  <TableRow key={line.key}>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {line.itemName}
                    </TableCell>
                    <TableCell align="right">{counted}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: varianceColor(variance) }}>
                      {variance > 0 ? '+' : ''}
                      {variance}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            {filled.length > 0 && (
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
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {totalCounted}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: varianceColor(totalVariance) }}>
                    {totalVariance > 0 ? '+' : ''}
                    {totalVariance}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
          {form.notes && (
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              <b>Notes:</b> {form.notes}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setPreviewOpen(false)} disabled={saving}>
            Back
          </Button>
          <Button size="small" variant="contained" color="primary" onClick={handleConfirm} disabled={saving}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

function CountDetailsDialog({ batch, onClose }) {
  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            margin: 0,
            width: 480,
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
            Stock count details
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
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Date:</b> {formatDate(batch.countDate)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Staff:</b> {batch.staff}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Location:</b> {batch.locationName || '—'}
          </Typography>
        </Box>
        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '26%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                System
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                Counted
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '14%' }}>
                Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Counted value
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Variance
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batch.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.itemName}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {item.systemQty}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {item.countedQty}
                </TableCell>
                <TableCell align="right">{formatMoney(item.costPrice)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(item.countedValue)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: varianceColor(item.variance) }}
                >
                  {item.variance > 0 ? '+' : ''}
                  {formatMoney(item.variance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
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
                {formatMoney(batch.totalCountedValue)}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: varianceColor(batch.totalVariance) }}
              >
                {batch.totalVariance > 0 ? '+' : ''}
                {formatMoney(batch.totalVariance)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        {batch.notes && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            <b>Notes:</b> {batch.notes}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function BatchItemsCell({ batch }) {
  const names = batch.items.map((it) => it.itemName)
  const shown = names.slice(0, 2).join(', ')
  const extra = names.length - 2
  const label = extra > 0 ? `${shown} +${extra} more` : shown
  return <span title={names.join(', ')}>{label}</span>
}

function StockCounts() {
  const { user } = useAuth()
  const showToast = useToast()
  const [counts, setCounts] = useState([])
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [days, setDays] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  useEffect(() => {
    let active = true
    setLoading(true)
    listStockCounts({ days })
      .then((rows) => {
        if (active) {
          setCounts(rows)
          setLoadError('')
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [days])

  useEffect(() => {
    let active = true
    listItems()
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch(() => {})
    listLocations()
      .then((rows) => {
        if (active) setLocations(rows)
      })
      .catch(() => {})
    listUsers()
      .then((rows) => {
        if (active) setUsers(rows)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return counts
    return counts.filter((batch) =>
      batch.items.some(
        (it) => it.itemName.toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q),
      ),
    )
  }, [counts, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  function handleChangePage(_, newPage) {
    setPage(newPage)
  }

  function handleChangeRowsPerPage(event) {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  function handleSearch(event) {
    setQuery(event.target.value)
    setPage(0)
  }

  async function refreshCounts() {
    const rows = await listStockCounts({ days })
    setCounts(rows)
  }

  async function handleCreate(data) {
    await createStockCount(data)
    setAddOpen(false)
    await refreshCounts()
    showToast('Stock count saved')
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search stock count history"
            value={query}
            onChange={handleSearch}
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Quick filter</InputLabel>
            <Select
              label="Quick filter"
              value={days}
              onChange={(event) => {
                setDays(event.target.value)
                setPage(0)
              }}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem', py: 0.9 } }}
            >
              <MenuItem value="">All time</MenuItem>
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setAddOpen(true)}
          >
            New Stock Count
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
            minWidth: 560,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Entry date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Staff</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Counted value
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Counted variance
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((batch) => (
                <TableRow
                  key={batch.id}
                  hover
                  onClick={() => setDetails(batch)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatDate(batch.countDate)}</TableCell>
                  <TableCell>{batch.staff}</TableCell>
                  <TableCell>{batch.locationName || '—'}</TableCell>
                  <TableCell>
                    <BatchItemsCell batch={batch} />
                  </TableCell>
                  <TableCell align="right">{formatMoney(batch.totalCountedValue)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      color: varianceColor(batch.totalVariance),
                    }}
                  >
                    {batch.totalVariance > 0 ? '+' : ''}
                    {formatMoney(batch.totalVariance)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No stock counts found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
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

      {addOpen && (
        <NewCountDialog
          items={items}
          locations={locations}
          users={users}
          defaultStaff={user?.id ?? ''}
          onSave={handleCreate}
          onClose={() => setAddOpen(false)}
        />
      )}
      {details && <CountDetailsDialog batch={details} onClose={() => setDetails(null)} />}
    </Card>
  )
}

export default StockCounts
