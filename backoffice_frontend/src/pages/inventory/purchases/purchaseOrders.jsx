import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
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
import { listItems } from '../../../api/items'
import { listPurchases, createPurchase, sendPurchase, receivePurchase, fetchAttachmentBlob } from '../../../api/purchases'
import { listStockLevels } from '../../../api/stockLevels'
import { listLocations } from '../../../api/locations'
import { listSuppliers } from '../../../api/suppliers'
import { listUsers } from '../../../api/users'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/Toast'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatMoney(value) {
  return money.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

const statusConfig = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'info' },
  received: { label: 'Received', color: 'success' },
}

function StatusChip({ status }) {
  const config = statusConfig[status] || { label: status || '—', color: 'default' }
  return (
    <Chip
      size="small"
      label={config.label}
      color={config.color}
      sx={{ height: 20, fontSize: '0.66rem', '& .MuiChip-label': { px: 1 } }}
    />
  )
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

function NewPurchaseDialog({ items, suppliers, locations, users, defaultStaff, onSave, onClose }) {
  const keyRef = useRef(0)
  const highlightedRef = useRef(null)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [levels, setLevels] = useState([])
  const levelById = useMemo(() => new Map(levels.map((l) => [l.itemId, l])), [levels])
  const [form, setForm] = useState({
    purchaseDate: new Date().toISOString().slice(0, 10),
    poNumber: '',
    staff: defaultStaff,
    supplierId: '',
    notes: '',
  })
  const [lines, setLines] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
  const selectedSupplierName =
    suppliers.find((s) => s.id === Number(form.supplierId))?.name ?? ''
  const selectedStaffName =
    users.find((u) => u.id === Number(form.staff))?.name ?? ''

  const usedIds = new Set(lines.map((line) => line.itemId))
  const availableItems = items.filter((item) => !usedIds.has(item.id))

  function onHandFor(line) {
    return levelById.get(line.itemId)?.onHand ?? 0
  }

  function defaultCostFor(itemId) {
    return levelById.get(itemId)?.costPrice ?? 0
  }

  function addItem(option) {
    setLines((prev) => [
      ...prev,
      {
        key: ++keyRef.current,
        itemId: option.id,
        itemName: option.name,
        sku: option.sku,
        qty: '',
        unitCost: String(defaultCostFor(option.id)),
      },
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

  const filled = lines.filter((line) => Number(line.qty) > 0)
  const totalQty = filled.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  const totalValue = filled.reduce(
    (sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitCost) || 0),
    0,
  )
  const canReview = form.staff && selectedLocation && filled.length > 0

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onSave({
        purchaseDate: form.purchaseDate,
        poNumber: form.poNumber.trim() || null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        staff: selectedStaffName,
        notes: form.notes || null,
        locationId: Number(selectedLocation),
        items: filled.map((line) => ({
          itemId: Number(line.itemId),
          qty: Number(line.qty),
          unitCost: Number(line.unitCost) || 0,
        })),
      })
    } catch (err) {
      setError(err.message || 'Failed to save purchase')
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
            width: { xs: '100%', sm: 600 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100%)', sm: 600 },
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
            New purchase
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
            label="Purchase date"
            value={form.purchaseDate}
            onChange={handleChange('purchaseDate')}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={inputSx}
          />
          <TextField
            variant="standard"
            size="small"
            label="PO number"
            placeholder="e.g. PO-001"
            value={form.poNumber}
            onChange={handleChange('poNumber')}
            sx={inputSx}
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
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
          <FormControl variant="standard" size="small" sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Supplier</InputLabel>
            <Select
              label="Supplier"
              value={form.supplierId}
              onChange={handleChange('supplierId')}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
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
            Saved as a <b>draft</b> into <b>{selectedLocationName}</b>. Stock only moves when you
            send the order and then record the receipt.
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
              <TableCell sx={{ fontWeight: 600, width: '26%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '15%' }}>
                Qty
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '20%' }}>
                Unit cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '16%' }}>
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
                <TableCell align="right">
                  <TextField
                    variant="standard"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 'any' }}
                    value={line.unitCost}
                    onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '0.75rem', textAlign: 'right', py: 0.25 },
                      '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
                      width: '100%',
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney((Number(line.qty) || 0) * (Number(line.unitCost) || 0))}
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
            Save as draft
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Date:</b> {formatDate(form.purchaseDate)}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Staff:</b> {selectedStaffName}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Supplier:</b> {selectedSupplierName || '—'}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Location:</b> {selectedLocationName}
            </Typography>
          </Box>
          <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '14%' }}>
                  Qty
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '24%' }}>
                  Unit cost
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '32%' }}>
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
                  <TableCell align="right">{formatMoney(Number(line.unitCost) || 0)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney((Number(line.qty) || 0) * (Number(line.unitCost) || 0))}
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
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
            This is saved as a draft. Next you&apos;ll send it to the supplier, then record the receipt to update stock.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setPreviewOpen(false)} disabled={saving}>
            Back
          </Button>
          <Button size="small" variant="contained" color="primary" onClick={handleConfirm} disabled={saving}>
            Save as draft
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

function SendDialog({ purchase, suppliers, onSend, onClose }) {
  const supplier = suppliers.find((s) => s.id === purchase.supplierId)
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setEmail(supplier?.email ?? '')
    setError('')
  }, [purchase, supplier])

  async function handleSend() {
    if (!email.trim()) {
      setError('An email address is required to send the PO')
      return
    }
    setSending(true)
    setError('')
    try {
      await onSend({ email: email.trim() })
    } catch (err) {
      setError(err.message || 'Failed to send purchase order')
      setSending(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => !sending && onClose()}
      slotProps={{
        paper: {
          sx: { borderRadius: 2, margin: 0, width: 420, maxWidth: 'calc(100% - 32px)' },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Send purchase order
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
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
          <b>PO:</b> {purchase.poNumber || `#${purchase.id}`} — <b>Supplier:</b> {purchase.supplierName || '—'}
        </Typography>
        <TextField
          variant="standard"
          size="small"
          label="Recipient email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={inputSx}
        />
        <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
          Pre-filled from the supplier&apos;s saved email. The PO is emailed when SMTP is configured;
          otherwise it is still marked as sent.
        </Typography>
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSend} disabled={sending}>
          {sending ? 'Sending...' : 'Send PO'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ReceiveDialog({ purchase, users, defaultStaff, onReceive, onClose }) {
  const [lines, setLines] = useState(() =>
    purchase.items.map((it) => ({
      key: it.id,
      itemId: it.itemId,
      itemName: it.itemName,
      ordered: it.qty,
      receivedQty: String(it.qty),
      unitCost: String(it.unitCost),
    })),
  )
  const [staff, setStaff] = useState(defaultStaff)
  const [note, setNote] = useState('')
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedStaffName = users.find((u) => u.id === Number(staff))?.name ?? ''

  function updateLine(key, patch) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function handleFiles(event) {
    setFileError('')
    const picked = Array.from(event.target.files || [])
    const tooBig = picked.filter((f) => f.size > 10 * 1024 * 1024)
    if (tooBig.length) {
      setFileError('Each file must be under 10 MB')
      setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= 10 * 1024 * 1024)])
      return
    }
    setFiles((prev) => [...prev, ...picked])
  }

  const received = lines.filter((line) => Number(line.receivedQty) > 0)
  const totalQty = received.reduce((sum, line) => sum + (Number(line.receivedQty) || 0), 0)
  const totalValue = received.reduce(
    (sum, line) => sum + (Number(line.receivedQty) || 0) * (Number(line.unitCost) || 0),
    0,
  )
  const canReview = staff && received.length > 0

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onReceive({
        staff: selectedStaffName,
        notes: note || null,
        attachments: files,
        items: lines.map((line) => ({
          itemId: Number(line.itemId),
          receivedQty: Number(line.receivedQty) || 0,
          unitCost: Number(line.unitCost) || 0,
        })),
      })
    } catch (err) {
      setError(err.message || 'Failed to receive purchase')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            margin: 0,
            width: { xs: '100%', sm: 620 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100%)', sm: 620 },
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
            Receive purchase
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
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>PO:</b> {purchase.poNumber || `#${purchase.id}`} — <b>Supplier:</b> {purchase.supplierName || '—'} —{' '}
            <b>Location:</b> {purchase.locationName || '—'}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <FormControl variant="standard" size="small" sx={{ minWidth: 140, ...inputSx }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Received by</InputLabel>
            <Select
              label="Received by"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
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

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' },
          }}
        >
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { borderBottomColor: 'text.primary' } }}>
              <TableCell sx={{ fontWeight: 600, width: '26%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                Ordered
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '20%' }}>
                Received
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '20%' }}>
                Unit cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '22%' }}>
                Value
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line.itemName}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                  {line.ordered}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
                    <StepperInput
                      value={line.receivedQty}
                      onChange={(value) => updateLine(line.key, { receivedQty: value })}
                    />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    variant="standard"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 'any' }}
                    value={line.unitCost}
                    onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '0.75rem', textAlign: 'right', py: 0.25 },
                      '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
                      width: '100%',
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney((Number(line.receivedQty) || 0) * (Number(line.unitCost) || 0))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {received.length > 0 && (
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
                  Total received
                </TableCell>
                <TableCell />
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
        <TextField
          variant="standard"
          size="small"
          label="Receive note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          sx={inputSx}
        />
        <Box>
          <input
            accept="*/*"
            id="receive-attachments-input"
            type="file"
            multiple
            hidden
            onChange={handleFiles}
          />
          <label htmlFor="receive-attachments-input">
            <Button
              size="small"
              variant="outlined"
              component="span"
              sx={{ fontSize: '0.7rem', textTransform: 'none' }}
            >
              Add attachment (invoice, delivery note...)
            </Button>
          </label>
          {files.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {files.map((f, idx) => (
                <Box key={`${f.name}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📎 {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    title="Remove file"
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          {fileError && (
            <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.66rem', display: 'block', mt: 0.5 }}>
              {fileError}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
          Receiving writes the IN stock movements and rolls the received unit costs into the item&apos;s current cost price.
        </Typography>
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" disabled={saving || !canReview} onClick={() => setPreviewOpen(true)}>
          Review
        </Button>
      </DialogActions>

      <Dialog open={previewOpen} onClose={() => !saving && setPreviewOpen(false)}>
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Confirm receipt
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>PO:</b> {purchase.poNumber || `#${purchase.id}`}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Supplier:</b> {purchase.supplierName || '—'}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Received by:</b> {selectedStaffName}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              <b>Location:</b> {purchase.locationName || '—'}
            </Typography>
          </Box>
          <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '16%' }}>
                  Received
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '24%' }}>
                  Unit cost
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, width: '26%' }}>
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {received.map((line) => (
                <TableRow key={line.key}>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.itemName}
                  </TableCell>
                  <TableCell align="right">{Number(line.receivedQty)}</TableCell>
                  <TableCell align="right">{formatMoney(Number(line.unitCost) || 0)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney((Number(line.receivedQty) || 0) * (Number(line.unitCost) || 0))}
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
          </Table>
          {note && (
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              <b>Receive note:</b> {note}
            </Typography>
          )}
          {files.length > 0 && (
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              <b>Attachments ({files.length}):</b> {files.map((f) => f.name).join(', ')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setPreviewOpen(false)} disabled={saving}>
            Back
          </Button>
          <Button size="small" variant="contained" color="primary" onClick={handleConfirm} disabled={saving}>
            Confirm receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

function PurchaseDetailsDialog({ purchase, onClose }) {
  const showToast = useToast()
  const [openingId, setOpeningId] = useState(null)

  async function handleOpen(att) {
    if (openingId) return
    setOpeningId(att.id)
    try {
      const blob = await fetchAttachmentBlob(purchase.id, att.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (err) {
      showToast(err.message || 'Failed to open attachment', 'error')
    } finally {
      setOpeningId(null)
    }
  }

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
            Purchase details
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
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Date:</b> {formatDate(purchase.date)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>PO:</b> {purchase.poNumber || '—'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Supplier:</b> {purchase.supplierName || '—'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Staff:</b> {purchase.staff}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Location:</b> {purchase.locationName || '—'}
          </Typography>
          <StatusChip status={purchase.status} />
        </Box>
        {(purchase.status === 'sent' || purchase.status === 'received') && (
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
            <b>Sent:</b> {formatDateTime(purchase.sentAt)} to {purchase.sentToEmail || '—'}
            {purchase.status === 'received' && (
              <>
                {' '}— <b>Received:</b> {formatDateTime(purchase.receivedAt)}
              </>
            )}
          </Typography>
        )}
        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '16%' }}>
                Qty
              </TableCell>
              {purchase.items.some((it) => it.receivedQty != null) && (
                <TableCell align="right" sx={{ fontWeight: 600, width: '16%' }}>
                  Received
                </TableCell>
              )}
              <TableCell align="right" sx={{ fontWeight: 600, width: '22%' }}>
                Unit cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '22%' }}>
                Value
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchase.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.itemName}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {item.qty}
                </TableCell>
                {purchase.items.some((it) => it.receivedQty != null) && (
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {item.receivedQty != null ? item.receivedQty : 0}
                  </TableCell>
                )}
                <TableCell align="right">{formatMoney(item.unitCost)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(item.receivedQty != null ? item.receivedValue : item.value)}
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
                {purchase.totalQty}
              </TableCell>
              {purchase.items.some((it) => it.receivedQty != null) && (
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {purchase.receivedQty ?? 0}
                </TableCell>
              )}
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(purchase.receivedQty != null ? purchase.receivedValue : purchase.totalValue)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        {purchase.notes && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            <b>Notes:</b> {purchase.notes}
          </Typography>
        )}
        {purchase.receiveNote && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            <b>Receive note:</b> {purchase.receiveNote}
          </Typography>
        )}
        {purchase.attachments?.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 0.5 }}>
              <b>Attachments ({purchase.attachments.length}):</b>
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {purchase.attachments.map((att) => (
                <Box key={att.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleOpen(att)}
                    disabled={openingId === att.id}
                    sx={{ fontSize: '0.68rem', textTransform: 'none', py: 0.15 }}
                  >
                    {openingId === att.id ? 'Opening...' : att.originalName}
                  </Button>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                    {(att.size / 1024).toFixed(0)} KB · {att.uploadedBy || '—'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
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

function BatchItemsCell({ purchase }) {
  const names = purchase.items.map((it) => `${it.itemName} (${it.qty})`)
  const shown = names.slice(0, 2).join(', ')
  const extra = names.length - 2
  const label = extra > 0 ? `${shown} +${extra} more` : shown
  return <span title={names.join(', ')}>{label}</span>
}

function PurchaseOrders() {
  const { user } = useAuth()
  const showToast = useToast()
  const [purchases, setPurchases] = useState([])
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [days, setDays] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [sendTarget, setSendTarget] = useState(null)
  const [receiveTarget, setReceiveTarget] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  useEffect(() => {
    let active = true
    setLoading(true)
    listPurchases({ days })
      .then((rows) => {
        if (active) {
          setPurchases(rows)
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
    listSuppliers()
      .then((rows) => {
        if (active) setSuppliers(rows)
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
    if (!q) return purchases
    return purchases.filter(
      (p) =>
        p.items.some(
          (it) => it.itemName.toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q),
        ) ||
        (p.supplierName || '').toLowerCase().includes(q) ||
        (p.poNumber || '').toLowerCase().includes(q) ||
        (p.locationName || '').toLowerCase().includes(q),
    )
  }, [purchases, query])

  const totalValue = filtered.reduce((sum, p) => sum + (Number(p.totalValue) || 0), 0)
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

  async function refreshPurchases() {
    const rows = await listPurchases({ days })
    setPurchases(rows)
  }

  async function handleCreate(data) {
    await createPurchase(data)
    setAddOpen(false)
    await refreshPurchases()
    showToast('Purchase order saved as draft')
  }

  async function handleSend(data) {
    const result = await sendPurchase(sendTarget.id, data)
    setSendTarget(null)
    await refreshPurchases()
    if (result.emailDelivered) {
      showToast(`Purchase order sent by email to ${result.sentToEmail}`)
    } else {
      showToast(`Purchase order marked as sent (${result.emailReason || 'email not sent'})`, 'info')
    }
  }

  async function handleReceive(data) {
    await receivePurchase(receiveTarget.id, data)
    setReceiveTarget(null)
    await refreshPurchases()
    showToast('Purchase received - stock levels updated')
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search purchases"
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
              Total purchase value
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
            New Purchase
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
            minWidth: 980,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>PO</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Total qty
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Total value
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  onClick={() => setDetails(p)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatDate(p.date)}</TableCell>
                  <TableCell>{p.poNumber || '—'}</TableCell>
                  <TableCell>{p.supplierName || '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={p.status} />
                  </TableCell>
                  <TableCell>
                    <BatchItemsCell purchase={p} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {p.totalQty}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(p.totalValue)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                      {p.status === 'draft' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ fontSize: '0.66rem', py: 0.15, minWidth: 0 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSendTarget(p)
                          }}
                        >
                          Send
                        </Button>
                      )}
                      {(p.status === 'draft' || p.status === 'sent') && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          sx={{ fontSize: '0.66rem', py: 0.15, minWidth: 0 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setReceiveTarget(p)
                          }}
                        >
                          Receive
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>No purchases recorded.</TableCell>
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
        <NewPurchaseDialog
          items={items}
          suppliers={suppliers}
          locations={locations}
          users={users}
          defaultStaff={user?.id ?? ''}
          onSave={handleCreate}
          onClose={() => setAddOpen(false)}
        />
      )}
      {details && <PurchaseDetailsDialog purchase={details} onClose={() => setDetails(null)} />}
      {sendTarget && (
        <SendDialog
          purchase={sendTarget}
          suppliers={suppliers}
          onSend={handleSend}
          onClose={() => setSendTarget(null)}
        />
      )}
      {receiveTarget && (
        <ReceiveDialog
          purchase={receiveTarget}
          users={users}
          defaultStaff={user?.id ?? ''}
          onReceive={handleReceive}
          onClose={() => setReceiveTarget(null)}
        />
      )}
    </Card>
  )
}

export default PurchaseOrders
