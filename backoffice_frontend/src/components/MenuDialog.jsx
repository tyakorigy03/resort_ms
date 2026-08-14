import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { listItems } from '../api/items'
import { createMenu, updateMenu } from '../api/menus'
import { useToast } from './Toast'

let keyCounter = 0
function nextKey() {
  keyCounter += 1
  return keyCounter
}

function priceOfItem(item) {
  const main = item.prices?.find((p) => p.isDefault)
  return main ? Number(main.price) : null
}

function fmt(value) {
  return value === null || value === undefined ? '—' : `$${Number(value).toFixed(2)}`
}

function MenuDialog({ open, onClose, onSaved, initial = null }) {
  const showToast = useToast()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [screens, setScreens] = useState([])
  const [tabIndex, setTabIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        description: initial?.description ?? '',
      })
      setScreens(
        initial?.screens?.length
          ? initial.screens.map((s) => ({
              key: nextKey(),
              name: s.name,
              items: s.items.map((i) => ({
                itemId: i.itemId,
                itemName: i.itemName,
                itemPrice: i.itemPrice ?? null,
              })),
            }))
          : [{ key: nextKey(), name: '', items: [] }],
      )
      setTabIndex(0)
      setError('')
      listItems()
        .then(setItems)
        .catch(() => {})
    }
  }, [open, initial])

  function updateScreen(key, field, value) {
    setScreens((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)))
  }

  function moveScreen(index, direction) {
    setScreens((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeScreen(key) {
    setScreens((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev))
  }

  function addItemToScreen(key, item) {
    setScreens((prev) =>
      prev.map((s) =>
        s.key === key && !s.items.some((x) => x.itemId === item.id)
          ? { ...s, items: [...s.items, { itemId: item.id, itemName: item.name, itemPrice: priceOfItem(item) }] }
          : s,
      ),
    )
  }

  function removeItemFromScreen(screenKey, itemId) {
    setScreens((prev) =>
      prev.map((s) => (s.key === screenKey ? { ...s, items: s.items.filter((i) => i.itemId !== itemId) } : s)),
    )
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Menu name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        screens: screens
          .filter((s) => s.name.trim() && s.items.length)
          .map((s) => ({
            name: s.name.trim(),
            items: s.items.map((i) => ({ itemId: Number(i.itemId) })),
          })),
      }
      if (initial) {
        await updateMenu(initial.id, payload)
        showToast('Menu updated')
      } else {
        await createMenu(payload)
        showToast('Menu created')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save menu')
    } finally {
      setSaving(false)
    }
  }

  const previewScreens = screens.filter((s) => s.name.trim())
  const previewTab = previewScreens.length ? Math.min(tabIndex, previewScreens.length - 1) : 0
  const smallInput = { '& .MuiInputBase-input': { fontSize: '0.78rem' }, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            width: { xs: '100%', sm: 600 },
            maxWidth: { xs: 'calc(100% - 24px)', sm: 600 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {initial ? 'Edit menu' : 'New menu'}
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
          minHeight: 280,
        }}
      >
        <TextField
          variant="standard"
          size="small"
          label="Menu name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          sx={smallInput}
        />
        <TextField
          variant="standard"
          size="small"
          label="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          sx={smallInput}
        />
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
            Screens
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setScreens((prev) => [...prev, { key: nextKey(), name: '', items: [] }])}
          >
            Add screen
          </Button>
        </Box>

        {screens.map((screen, index) => {
          const available = items.filter((i) => !screen.items.some((x) => x.itemId === i.id))
          return (
            <Box key={screen.key} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  variant="standard"
                  size="small"
                  fullWidth
                  placeholder="Screen name, e.g. Starters"
                  value={screen.name}
                  onChange={(e) => updateScreen(screen.key, 'name', e.target.value)}
                  sx={smallInput}
                />
                <IconButton size="small" title="Move up" disabled={index === 0} onClick={() => moveScreen(index, -1)}>
                  <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  title="Move down"
                  disabled={index === screens.length - 1}
                  onClick={() => moveScreen(index, 1)}
                >
                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" title="Remove screen" onClick={() => removeScreen(screen.key)}>
                  <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              <Autocomplete
                size="small"
                options={available}
                getOptionLabel={(o) => o.name}
                value={null}
                onChange={(_, value) => {
                  if (value) addItemToScreen(screen.key, value)
                }}
                renderOption={(props, opt) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                      <span>{opt.name}</span>
                      <span style={{ color: 'rgba(0,0,0,0.55)', fontWeight: 600 }}>{fmt(priceOfItem(opt))}</span>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    size="small"
                    placeholder="Search items to add..."
                    sx={{ mt: 1, '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
                  />
                )}
              />

              {screen.items.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {screen.items.map((it) => (
                    <Chip
                      key={it.itemId}
                      label={`${it.itemName} · ${fmt(it.itemPrice)}`}
                      size="small"
                      onDelete={() => removeItemFromScreen(screen.key, it.itemId)}
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )
        })}

        {previewScreens.length > 0 && (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1, flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem', color: 'text.secondary' }}>
              Live preview
            </Typography>
            <Tabs
              value={previewTab}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 30,
                mb: 0.5,
                '& .MuiTab-root': { minHeight: 30, fontSize: '0.7rem', textTransform: 'none', px: 1.5 },
                '& .MuiTabs-indicator': { height: 2 },
              }}
            >
              {previewScreens.map((s) => (
                <Tab key={s.key} label={s.name} />
              ))}
            </Tabs>
            <Box>
              {previewScreens[previewTab].items.map((it) => (
                <Box
                  key={it.itemId}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.5,
                    fontSize: '0.72rem',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <span>{it.itemName}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(it.itemPrice)}</span>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MenuDialog
