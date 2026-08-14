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
import { createWastage, listWastages } from '../../api/wastage'
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

const REASONS = ['Expired', 'Damaged', 'Spoiled', 'Spilled', 'Burnt', 'Other']

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
        onClick={() => onChange(String(Math.max(0, (Number(value) || 0) - 1)))}
        sx={{ p: 0.15, borderRadius: 0, minWidth: 24, width: 24, height: 24 }}
      >
        <RemoveIcon sx={{ fontSize: 12 }} />
      </IconButton>
      <TextField
        variant="standard"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          '& .MuiInputBase-input': { fontSize: '0.75rem', textAlign: 'center', width: 32, py: 0.25, px: 0 },
          '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
        }}
      />
      <IconButton
        size="small"
        aria-label="increase"
        onClick={() => onChange(String((Number(value) || 0) + 1))}
        sx={{ p: 0.15, borderRadius: 0, minWidth: 24, width: 24, height: 24 }}
      >
        <AddIcon sx={{ fontSize: 12 }} />
      </IconButton>
    </Box>
  )
}

function NewWastageDialog({ items, locations = [], users = [], defaultStaff, onSave, onClose }) {
  const keyRef = useRef(0)
  const highlightedRef = useRef(null)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [levels, setLevels] = useState([])
  const levelById = useMemo(() => new Map(levels.map((l) => [l.itemId, l])), [levels])
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    staff: defaultStaff,
    notes: '',
  })
  const [lines, setLines] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Levels (on-hand + cost price) come from the SELECTED location so the
  // preview can show live value per line.
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
    return levelById.get(line.itemId)?.onHand ?? 0
  }

  function costFor(line) {
    return Number(levelById.get(line.itemId)?.costPrice ?? 0)
  }

  function addItem(option) {
    setLines((prev) => [
      ...prev,
      { key: ++keyRef.current, itemId: option.id, itemName: option.name, sku: option.sku, qty: '', reason: 'Expired', customReason: '' },
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

  function updateLine(key, patch) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function removeLine(key) {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function reasonFor(line) {
    return line.reason === 'Other' ? line.customReason.trim() : line.reason
  }

  const filled = lines.filter((line) => {
    const q = Number(line.qty)
    return q > 0 && reasonFor(line)
  })
  const totalQty = filled.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  const totalValue = filled.reduce((sum, line) => sum + (Number(line.qty) || 0) * costFor(line), 0)
  const canReview = form.staff && selectedLocation && filled.length > 0

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onSave({
        date: form.date,
        staff: selectedStaffName,
        notes: form.notes || null,
        locationId: Number(selectedLocation),
        items: filled.map((line) => ({
          itemId: Number(line.itemId),
          qty: Number(line.qty),
          reason: reasonFor(line),
        })),
      })
    } catch (err) {
      setError(err.message || 'Failed to record wastage')
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
            width: { xs: '100%', sm: 560 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100%)', sm: 560 },
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
            Record wastage
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
            value={form.date}
            onChange={handleChange('date')}
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
            Stock is written off from <b>{selectedLocationName}</b>. Values use current cost prices.
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
              <TableCell sx={{ fontWeight: 600, width: '30%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Qty
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: '24%' }}>Reason</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Value
              </TableCell>
              <TableCell sx={{ width: 32 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>
                  No items yet — pick one above.
                </TableCell>
              </TableRow>
            )}
            {lines.map((line) => (
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
                  <Box sx={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
                    <StepperInput value={line.qty} onChange={(value) => updateLine(line.key, { qty: value })} />
                  </Box>
                </TableCell>
                <TableCell>
                  {line.reason === 'Other' ? (
                    <TextField
                      variant="standard"
                      size="small"
                      placeholder="Custom reason"
                      value={line.customReason}
                      onChange={(e) => updateLine(line.key, { customReason: e.target.value })}
                      autoFocus
                      sx={inputSx}
                    />
                  ) : (
                    <FormControl variant="standard" size="small" sx={{ width: '100%' }}>
                      <Select
                        value={line.reason}
                        onChange={(e) => updateLine(line.key, { reason: e.target.value })}
                        sx={{ '& .MuiSelect-select': { fontSize: '0.78rem', py: 0.3 } }}
                      >
                        {REASONS.map((r) => (
                          <MenuItem key={r} value={r}>
                            {r}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney((Number(line.qty) || 0) * costFor(line))}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => removeLine(line.key)} title="Remove line">
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {totalQty}
                </TableCell>
                <TableCell />
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(totalValue)}
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
            Confirm wastage
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Date:</b> {formatDate(form.date)}
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
                <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '14%' }}>
                  Qty
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: '26%' }}>Reason</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '26%' }}>
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filled.map((line) => (
                <TableRow key={line.key}>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.itemName}
                  </TableCell>
                  <TableCell align="right">{Number(line.qty)}</TableCell>
                  <TableCell>{reasonFor(line)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney((Number(line.qty) || 0) * costFor(line))}
                  </TableCell>
                </TableRow>
              ))}
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
                    {totalQty}
                  </TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(totalValue)}
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

function WastageDetailsDialog({ batch, onClose }) {
  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            margin: 0,
            width: 520,
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
            Wastage details
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
            <b>Date:</b> {formatDate(batch.date)}
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
              <TableCell sx={{ fontWeight: 600, width: '30%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                Qty
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: '24%' }}>Reason</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                Unit cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '16%' }}>
                Value
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
                  {item.qty}
                </TableCell>
                <TableCell>{item.reason}</TableCell>
                <TableCell align="right">{formatMoney(item.unitCost)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(item.value)}
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
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {batch.totalQty}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(batch.totalValue)}
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
  const names = batch.items.map((it) => `${it.itemName} (${it.qty})`)
  const shown = names.slice(0, 2).join(', ')
  const extra = names.length - 2
  const label = extra > 0 ? `${shown} +${extra} more` : shown
  return <span title={names.join(', ')}>{label}</span>
}

function Wastage() {
  const { user } = useAuth()
  const showToast = useToast()
  const [wastages, setWastages] = useState([])
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
    listWastages({ days })
      .then((rows) => {
        if (active) {
          setWastages(rows)
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
    if (!q) return wastages
    return wastages.filter(
      (batch) =>
        batch.items.some(
          (it) => it.itemName.toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q),
        ) ||
        (batch.locationName || '').toLowerCase().includes(q) ||
        (batch.staff || '').toLowerCase().includes(q),
    )
  }, [wastages, query])

  const totalValue = filtered.reduce((sum, batch) => sum + (Number(batch.totalValue) || 0), 0)
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

  async function refreshWastages() {
    const rows = await listWastages({ days })
    setWastages(rows)
  }

  async function handleCreate(data) {
    await createWastage(data)
    setAddOpen(false)
    await refreshWastages()
    showToast('Wastage recorded')
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search wastage history"
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
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.68rem', color: 'text.secondary' }}>
              Total wastage value
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {formatMoney(totalValue)}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setAddOpen(true)}
          >
            Record Wastage
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
            minWidth: 620,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Staff</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Total qty
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Total value
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
                  <TableCell>{formatDate(batch.date)}</TableCell>
                  <TableCell>{batch.staff}</TableCell>
                  <TableCell>{batch.locationName || '—'}</TableCell>
                  <TableCell>
                    <BatchItemsCell batch={batch} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {batch.totalQty}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(batch.totalValue)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No wastage recorded.</TableCell>
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
        <NewWastageDialog
          items={items}
          locations={locations}
          users={users}
          defaultStaff={user?.id ?? ''}
          onSave={handleCreate}
          onClose={() => setAddOpen(false)}
        />
      )}
      {details && <WastageDetailsDialog batch={details} onClose={() => setDetails(null)} />}
    </Card>
  )
}

export default Wastage
