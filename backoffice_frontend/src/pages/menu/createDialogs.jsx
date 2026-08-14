import { useEffect, useState } from 'react'
import {
  Box,
  Button,
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
import { createItemsBatch, listItems } from '../../api/items'
import { listAccountingGroups } from '../../api/accountingGroups'
import {
  createModifier,
  createModifierGroup,
  listModifierGroups,
  updateModifier,
  updateModifierGroup,
} from '../../api/modifiers'
import { createCombo, updateCombo } from '../../api/combos'
import { useToast } from '../../components/Toast'

let keyCounter = 0
function nextKey() {
  keyCounter += 1
  return keyCounter
}

function DialogShell({ title, onClose, children, actions }) {
  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            width: { xs: '100%', sm: 420 },
            maxWidth: { xs: 'calc(100% - 24px)', sm: 420 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
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
          minHeight: 300,
        }}
      >
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>{actions}</DialogActions>
    </Dialog>
  )
}

function CancelButton({ onClose }) {
  return (
    <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
      Cancel
    </Button>
  )
}

function SaveButton({ onClick, disabled, saving }) {
  return (
    <Button size="small" variant="contained" color="primary" onClick={onClick} disabled={disabled || saving}>
      {saving ? 'Saving...' : 'Save'}
    </Button>
  )
}

function MultipleItemsDialog({ open, onClose, onSaved }) {
  const showToast = useToast()
  const [groups, setGroups] = useState([])
  const [rows, setRows] = useState([{ key: nextKey(), name: '', price: '', accountingGroup: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setRows([{ key: nextKey(), name: '', price: '', accountingGroup: '' }])
      setError('')
      listAccountingGroups()
        .then(setGroups)
        .catch(() => {})
    }
  }, [open])

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  function removeRow(key) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.name.trim())
    if (valid.length === 0) {
      setError('Enter at least one item name')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createItemsBatch(valid.map((r) => ({ name: r.name.trim(), price: r.price, accountingGroup: r.accountingGroup || undefined })))
      showToast(`${valid.length} item(s) created`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create items')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title="Quick add multiple items"
      onClose={onClose}
      actions={
        <>
          <CancelButton onClose={onClose} />
          <SaveButton onClick={handleSave} saving={saving} />
        </>
      }
    >
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.4, px: 0.6, fontSize: '0.72rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '40%' }}>Item name</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '22%' }}>Price</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Accounting group</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 36 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <TextField
                    variant="standard"
                    size="small"
                    fullWidth
                    placeholder="Item name"
                    value={row.name}
                    onChange={(e) => updateRow(row.key, 'name', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    size="small"
                    type="number"
                    fullWidth
                    placeholder="0.00"
                    value={row.price}
                    onChange={(e) => updateRow(row.key, 'price', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    size="small"
                    select
                    fullWidth
                    value={row.accountingGroup}
                    onChange={(e) => updateRow(row.key, 'accountingGroup', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                  >
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={g.name}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => removeRow(row.key)} title="Remove line">
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon fontSize="small" />}
        onClick={() => setRows((prev) => [...prev, { key: nextKey(), name: '', price: '', accountingGroup: '' }])}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add line
      </Button>
    </DialogShell>
  )
}

function ComboDialog({ open, onClose, onSaved, initial = null }) {
  const showToast = useToast()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', price: '' })
  const [lines, setLines] = useState([{ key: nextKey(), itemId: '', qty: '1' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        price: initial?.price ?? '',
      })
      setLines(
        initial?.items?.length
          ? initial.items.map((i) => ({ key: nextKey(), itemId: i.itemId, qty: String(i.qty) }))
          : [{ key: nextKey(), itemId: '', qty: '1' }],
      )
      setError('')
      listItems()
        .then(setItems)
        .catch(() => {})
    }
  }, [open, initial])

  function updateLine(key, field, value) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
  }

  async function handleSave() {
    const itemsInCombo = lines.filter((l) => l.itemId)
    if (!form.name.trim()) {
      setError('Combo name is required')
      return
    }
    if (itemsInCombo.length === 0) {
      setError('Add at least one item to the combo')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price,
        items: itemsInCombo.map((l) => ({ itemId: Number(l.itemId), qty: Number(l.qty) || 1 })),
      }
      if (initial) {
        await updateCombo(initial.id, payload)
        showToast('Combo updated')
      } else {
        await createCombo(payload)
        showToast('Combo created')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save combo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={initial ? 'Edit combo' : 'New combo'}
      onClose={onClose}
      actions={
        <>
          <CancelButton onClose={onClose} />
          <SaveButton onClick={handleSave} saving={saving} />
        </>
      }
    >
      <TextField
        variant="standard"
        size="small"
        label="Combo name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
      />
      <TextField
        variant="standard"
        size="small"
        label="Combo price"
        type="number"
        value={form.price}
        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
        sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
      />
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          Items in combo
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setLines((prev) => [...prev, { key: nextKey(), itemId: '', qty: '1' }])}
        >
          Add item
        </Button>
      </Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.4, px: 0.6, fontSize: '0.72rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 36 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell>
                  <TextField
                    variant="standard"
                    size="small"
                    select
                    fullWidth
                    value={line.itemId}
                    onChange={(e) => updateLine(line.key, 'itemId', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                  >
                    {items.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    size="small"
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(line.key, 'qty', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))} title="Remove line">
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </DialogShell>
  )
}

function ModifierDialog({ open, onClose, onSaved, initial = null }) {
  const showToast = useToast()
  const [groups, setGroups] = useState([])
  const [form, setForm] = useState({ name: '', price: '', modifierGroupId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        price: initial?.price ?? '',
        modifierGroupId: initial?.modifierGroupId ?? '',
      })
      setError('')
      listModifierGroups()
        .then(setGroups)
        .catch(() => {})
    }
  }, [open, initial])

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Modifier name is required')
      return
    }
    if (!form.modifierGroupId) {
      setError('Choose a modifier group')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price,
        modifierGroupId: Number(form.modifierGroupId),
      }
      if (initial) {
        await updateModifier(initial.id, payload)
        showToast('Modifier updated')
      } else {
        await createModifier(payload)
        showToast('Modifier created')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save modifier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={initial ? 'Edit modifier' : 'New modifier'}
      onClose={onClose}
      actions={
        <>
          <CancelButton onClose={onClose} />
          <SaveButton onClick={handleSave} saving={saving} />
        </>
      }
    >
      <TextField
        variant="standard"
        size="small"
        label="Modifier name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
      />
      <TextField
        variant="standard"
        size="small"
        label="Price change"
        type="number"
        helperText="Extra charge for picking this modifier (0 = free)"
        value={form.price}
        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
        sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
      />
      <FormControl variant="standard" size="small" fullWidth>
        <InputLabel sx={{ fontSize: '0.75rem' }}>Modifier group</InputLabel>
        <Select
          value={form.modifierGroupId}
          onChange={(e) => setForm((prev) => ({ ...prev, modifierGroupId: e.target.value }))}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
        >
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}
    </DialogShell>
  )
}

function ModifierGroupDialog({ open, onClose, onSaved, initial = null }) {
  const showToast = useToast()
  const [form, setForm] = useState({ name: '', selectionType: 'single', minSelect: '1', maxSelect: '1' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              selectionType: initial.selectionType,
              minSelect: String(initial.minSelect),
              maxSelect: String(initial.maxSelect),
            }
          : { name: '', selectionType: 'single', minSelect: '1', maxSelect: '1' },
      )
      setError('')
    }
  }, [open, initial])

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Group name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        selectionType: form.selectionType,
        minSelect: Number(form.minSelect) || 1,
        maxSelect: Number(form.maxSelect) || 1,
      }
      if (initial) {
        await updateModifierGroup(initial.id, payload)
        showToast('Modifier group updated')
      } else {
        await createModifierGroup(payload)
        showToast('Modifier group created')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save modifier group')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={initial ? 'Edit modifier group' : 'New modifier group'}
      onClose={onClose}
      actions={
        <>
          <CancelButton onClose={onClose} />
          <SaveButton onClick={handleSave} saving={saving} />
        </>
      }
    >
      <TextField
        variant="standard"
        size="small"
        label="Group name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
      />
      <TextField
        variant="standard"
        size="small"
        select
        label="Selection"
        value={form.selectionType}
        onChange={(e) => setForm((prev) => ({ ...prev, selectionType: e.target.value }))}
        sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
      >
        <MenuItem value="single">Pick one</MenuItem>
        <MenuItem value="multiple">Pick several</MenuItem>
      </TextField>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <TextField
          variant="standard"
          size="small"
          label="Min select"
          type="number"
          value={form.minSelect}
          onChange={(e) => setForm((prev) => ({ ...prev, minSelect: e.target.value }))}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
        />
        <TextField
          variant="standard"
          size="small"
          label="Max select"
          type="number"
          value={form.maxSelect}
          onChange={(e) => setForm((prev) => ({ ...prev, maxSelect: e.target.value }))}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
        />
      </Box>
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}
    </DialogShell>
  )
}

export { MultipleItemsDialog, ComboDialog, ModifierDialog, ModifierGroupDialog }
