import { useEffect, useMemo, useState } from 'react'
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ReplayIcon from '@mui/icons-material/Replay'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import StepperInput from '../../../components/StepperInput'
import { listRecipes, getRecipe } from '../../../api/recipes'
import { listBatches, runBatch, setBatchStatus } from '../../../api/batches'
import { listStockLevels } from '../../../api/stockLevels'
import { listLocations } from '../../../api/locations'
import { listUsers } from '../../../api/users'
import { BatchDetailsDialog } from './batchHistory'
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

function today() {
  return new Date().toISOString().slice(0, 10)
}

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function InputsCell({ batch }) {
  const inputs = batch.lines.filter((l) => !l.isOutput)
  const names = inputs.map((l) => `${l.itemName} (${l.qty})`)
  const shown = names.slice(0, 2).join(', ')
  const extra = names.length - 2
  const label = extra > 0 ? `${shown} +${extra} more` : shown
  return <span title={names.join(', ')}>{label || '—'}</span>
}

function NewRunDialog({ recipes, locations, users, onClose, onSaved }) {
  const showToast = useToast()
  const [recipeId, setRecipeId] = useState('')
  const [recipe, setRecipe] = useState(null)
  const [form, setForm] = useState({
    qty: '1',
    outQty: '',
    outUnit: '',
    outTouched: false,
    batchRef: '',
    batchDate: today(),
    staff: '',
    locationId: '',
    notes: '',
  })
  const [levels, setLevels] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (recipeId) {
      getRecipe(recipeId)
        .then((r) => {
          if (active) setRecipe(r)
        })
        .catch((err) => {
          if (active) setError(err.message)
        })
    } else {
      setRecipe(null)
    }
    return () => {
      active = false
    }
  }, [recipeId])

  // Reset the output override whenever the recipe changes.
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      qty: '1',
      outQty: recipe ? String(recipe.outputQty ?? '') : '',
      outUnit: recipe?.outputUnit || '',
      outTouched: false,
    }))
  }, [recipe])

  useEffect(() => {
    const scale = Math.max(0, Number(form.qty) || 0)
    if (recipe && recipe.type !== 'made_to_order' && !form.outTouched) {
      setForm((prev) => ({ ...prev, outQty: String((Number(recipe.outputQty) * scale).toFixed(3)) }))
    }
  }, [recipe, form.qty, form.outTouched])

  useEffect(() => {
    let active = true
    if (form.locationId) {
      listStockLevels({ locationId: form.locationId })
        .then((rows) => {
          if (active) setLevels(rows)
        })
        .catch(() => {})
    } else {
      setLevels([])
    }
    return () => {
      active = false
    }
  }, [form.locationId])

  const levelById = useMemo(() => new Map(levels.map((l) => [l.itemId, l])), [levels])

  const isMadeToOrder = recipe?.type === 'made_to_order'
  const defaultUnit = recipe?.outputUnit || ''
  const unitOptions = useMemo(() => {
    if (!recipe) return []
    return [...new Set([recipe.outputUnit, ...recipe.ingredients.map((ing) => ing.unit)].filter(Boolean))]
  }, [recipe])

  const scale = Math.max(0, Number(form.qty) || 0)
  const rows = useMemo(() => {
    if (!recipe) return []
    const list = []
    let inputCost = 0
    for (const ing of recipe.ingredients) {
      const qty = Number((Number(ing.qty) * scale).toFixed(3))
      const unitCost = Number(levelById.get(ing.itemId)?.costPrice ?? 0)
      inputCost += qty * unitCost
      list.push({
        key: `in-${ing.id}`,
        itemName: ing.itemName,
        unit: ing.unit || '',
        qty,
        unitCost,
        onHand: Number(levelById.get(ing.itemId)?.onHand ?? 0),
        isOutput: false,
      })
    }
    const outputQty = isMadeToOrder
      ? scale
      : form.outTouched
        ? Number(form.outQty) || 0
        : Number((Number(recipe.outputQty) * scale).toFixed(3))
    const outputUnitCost = outputQty > 0 ? Math.round((inputCost / outputQty) * 100) / 100 : 0
    list.push({
      key: 'out',
      itemName: recipe.outputItemName,
      unit: form.outUnit || recipe.outputUnit || '',
      qty: outputQty,
      unitCost: outputUnitCost,
      onHand: Number(levelById.get(recipe.outputItemId)?.onHand ?? 0),
      isOutput: true,
    })
    return list
  }, [recipe, scale, isMadeToOrder, form.outQty, form.outTouched, form.outUnit, levelById])

  const totalInputCost = rows.filter((r) => !r.isOutput).reduce((s, r) => s + r.qty * r.unitCost, 0)
  const outputLine = rows.find((r) => r.isOutput)
  const selectedLocationName = locations.find((l) => l.id === Number(form.locationId))?.name ?? ''
  const selectedStaffName = users.find((u) => u.id === Number(form.staff))?.name ?? ''

  const canSave = Boolean(recipeId && recipe && form.locationId && form.staff && scale > 0)

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        recipeId: Number(recipeId),
        batchRef: form.batchRef.trim() || null,
        batchDate: form.batchDate,
        staff: selectedStaffName,
        locationId: Number(form.locationId),
        notes: form.notes.trim() || null,
        qty: isMadeToOrder ? undefined : scale,
        outputQty: isMadeToOrder ? scale : undefined,
      }
      if (!isMadeToOrder) {
        const override = Number(form.outQty)
        if (form.outTouched && !(override > 0)) {
          setError('Output produced must be positive')
          return
        }
        if (form.outTouched) payload.outputQtyOverride = override
      }
      if (form.outUnit && form.outUnit !== defaultUnit) payload.outputUnitOverride = form.outUnit
      const batch = await runBatch(payload)
      showToast(`Run ${batch.batchRef || `#${batch.id}`} recorded`)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to run batch')
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
            width: { xs: '100%', sm: 620 },
            maxWidth: { xs: '100%', sm: 620 },
            maxHeight: { xs: '100dvh', sm: '90vh' },
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
            New production run
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
      >
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Recipe *</InputLabel>
          <Select
            label="Recipe"
            value={recipeId}
            onChange={(e) => {
              setRecipeId(e.target.value)
              setError('')
            }}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {recipes.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
              {isMadeToOrder ? 'Output quantity (units to produce) *' : 'Quantity (recipe units) *'}
            </Typography>
            <StepperInput value={form.qty} onChange={(v) => setForm((prev) => ({ ...prev, qty: v }))} />
          </Box>
          {isMadeToOrder ? (
            <Box>
              <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                Output unit
              </Typography>
              <Autocomplete
                size="small"
                freeSolo
                options={unitOptions}
                value={form.outUnit || ''}
                inputValue={form.outUnit || ''}
                onInputChange={(_, value) => setForm((prev) => ({ ...prev, outUnit: value }))}
                onChange={(_, value) => setForm((prev) => ({ ...prev, outUnit: value ?? '' }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    size="small"
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '0.72rem' },
                      '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
                    }}
                  />
                )}
              />
            </Box>
          ) : (
            <>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                  Output produced (override)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StepperInput
                    value={form.outQty}
                    onChange={(v) => setForm((prev) => ({ ...prev, outQty: v, outTouched: true }))}
                  />
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={unitOptions}
                    value={form.outUnit || ''}
                    inputValue={form.outUnit || ''}
                    onInputChange={(_, value) => setForm((prev) => ({ ...prev, outUnit: value }))}
                    onChange={(_, value) => setForm((prev) => ({ ...prev, outUnit: value ?? '' }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        size="small"
                        title="Output unit (defaults to the recipe's unit)"
                        sx={{
                          width: 90,
                          '& .MuiInputBase-input': { fontSize: '0.72rem' },
                          '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
                        }}
                      />
                    )}
                  />
                </Box>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            variant="standard"
            size="small"
            label="Batch reference (optional)"
            value={form.batchRef}
            onChange={handleChange('batchRef')}
            placeholder="e.g. B-001"
            sx={inputSx}
          />
          <TextField
            variant="standard"
            size="small"
            type="date"
            label="Batch date"
            value={form.batchDate}
            onChange={handleChange('batchDate')}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={inputSx}
          />
          <FormControl variant="standard" size="small" sx={inputSx}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Staff *</InputLabel>
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
            <InputLabel sx={{ fontSize: '0.75rem' }}>Location *</InputLabel>
            <Select
              label="Location"
              value={form.locationId}
              onChange={handleChange('locationId')}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
            >
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TextField
          variant="standard"
          size="small"
          label="Notes (optional)"
          multiline
          minRows={2}
          value={form.notes}
          onChange={handleChange('notes')}
          sx={{ ...inputSx, mt: 0.5 }}
        />

        {form.locationId && (
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
            Ingredients are consumed from and the output is added to <b>{selectedLocationName}</b>. Costs use current cost
            prices.
          </Typography>
        )}

        {recipe && scale > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', mt: 0.5 }}>
              {recipe.name} × {scale}
            </Typography>
            <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '13%' }}>
                    Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '16%' }}>
                    Unit cost
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '17%' }}>
                    Value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '20%' }}>
                    On hand
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell
                      sx={{
                        fontWeight: row.isOutput ? 600 : 400,
                        color: row.isOutput ? 'primary.main' : 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.isOutput ? '★ ' : ''}
                      {row.itemName}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' ,textWrap:'nowrap'}}>
                      {row.qty} {row.unit}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(row.unitCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(row.qty * row.unitCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.onHand}
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
                  <TableCell sx={{ fontWeight: 600 }}>
                    {outputLine ? `Output value (${outputLine.itemName})` : 'Total'}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(totalInputCost)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}

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
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon fontSize="small" />}
          onClick={handleConfirm}
          disabled={!canSave || saving}
        >
          {saving ? 'Recording...' : 'Record Run'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Batches() {
  const showToast = useToast()
  const [batches, setBatches] = useState([])
  const [recipes, setRecipes] = useState([])
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('in_progress')
  const [query, setQuery] = useState('')
  const [details, setDetails] = useState(null)
  const [newRunOpen, setNewRunOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  async function refresh() {
    const rows = await listBatches()
    setBatches(rows)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    listBatches()
      .then((rows) => {
        if (active) {
          setBatches(rows)
          setLoadError('')
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    listRecipes()
      .then((rows) => {
        if (active) setRecipes(rows)
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
    return batches.filter((b) => {
      if (b.status !== filter) return false
      if (!q) return true
      return (
        (b.recipeName || '').toLowerCase().includes(q) ||
        (b.batchRef || '').toLowerCase().includes(q) ||
        (b.staff || '').toLowerCase().includes(q) ||
        (b.locationName || '').toLowerCase().includes(q) ||
        b.lines.some((l) => l.itemName.toLowerCase().includes(q))
      )
    })
  }, [batches, filter, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  async function handleToggleStatus(batch) {
    const next = batch.status === 'finished' ? 'in_progress' : 'finished'
    try {
      await setBatchStatus(batch.id, next)
      showToast(next === 'finished' ? 'Run marked as finished' : 'Run reopened')
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search runs"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, minWidth: 200 }}
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
          <Box sx={{ mx: 'auto' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={filter}
              onChange={(_, value) => {
                if (value) {
                  setFilter(value)
                  setPage(0)
                }
              }}
            >
              <ToggleButton value="in_progress" sx={{ fontSize: '0.72rem', textTransform: 'none' }}>
                In progress
              </ToggleButton>
              <ToggleButton value="finished" sx={{ fontSize: '0.72rem', textTransform: 'none' }}>
                Finished
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setNewRunOpen(true)}
            >
              New Run
            </Button>
          </Box>
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
            minWidth: 860,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '12%' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '13%' }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '20%' }}>Recipe</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ingredients</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '18%' }}>Output</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '13%' }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((batch) => {
                const outputLine = batch.lines.find((l) => l.isOutput)
                return (
                  <TableRow
                    key={batch.id}
                    hover
                    onClick={() => setDetails(batch)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{formatDate(batch.date)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            flexShrink: 0,
                            bgcolor: batch.status === 'finished' ? 'success.main' : 'warning.main',
                          }}
                        />
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {batch.batchRef || `#${batch.id}`}
                        </span>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {batch.recipeName || '—'}
                    </TableCell>
                    <TableCell>
                      <InputsCell batch={batch} />
                    </TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {batch.outputQty > 0
                        ? `${batch.outputQty} ${batch.outputUnit || outputLine?.unit || ''} × ${outputLine?.itemName ?? ''}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(batch.inputCost)}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {batch.status === 'in_progress' ? (
                        <Button
                          size="small"
                          startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleToggleStatus(batch)}
                        >
                          Finish
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          startIcon={<ReplayIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleToggleStatus(batch)}
                        >
                          Reopen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No {filter === 'finished' ? 'finished' : 'in progress'} runs.</TableCell>
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

      {newRunOpen && (
        <NewRunDialog
          recipes={recipes}
          locations={locations}
          users={users}
          onClose={() => setNewRunOpen(false)}
          onSaved={() => {
            setNewRunOpen(false)
            refresh()
          }}
        />
      )}

      {details && <BatchDetailsDialog batch={details} onClose={() => setDetails(null)} />}
    </Card>
  )
}

export default Batches
