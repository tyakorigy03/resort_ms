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
  IconButton,
  InputAdornment,
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
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import StepperInput from '../../../components/StepperInput'
import RichTextEditor from '../../../components/RichTextEditor'
import RichNote from '../../../components/RichNote'
import { listRecipes, createRecipe, updateRecipe, deleteRecipe } from '../../../api/recipes'
import { listItems } from '../../../api/items'
import { useToast } from '../../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function IngredientCell({ recipe }) {
  const names = recipe.ingredients.map((ing) => `${ing.itemName} (${ing.qty} ${ing.unit || ''})`.trim())
  const shown = names.slice(0, 2).join(', ')
  const extra = names.length - 2
  const label = extra > 0 ? `${shown} +${extra} more` : shown
  return <span title={names.join(', ')}>{label || '—'}</span>
}

function RecipeDialog({ recipe, items, onSave, onClose }) {
  const [form, setForm] = useState({
    type: 'made_in_batches',
    outputItemId: '',
    outputQty: '',
    unit: '',
    notes: '',
  })
  const [lines, setLines] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const keyRef = useRef(1)

  useEffect(() => {
    if (recipe) {
      setForm({
        type: recipe.type ?? 'made_in_batches',
        outputItemId: recipe.outputItemId,
        outputQty: recipe.outputQty == null ? '' : String(recipe.outputQty),
        unit: recipe.outputUnit ?? '',
        notes: recipe.notes ?? '',
      })
      setLines(
        recipe.ingredients.map((ing) => ({
          key: keyRef.current++,
          itemId: ing.itemId,
          itemName: ing.itemName,
          sku: ing.sku,
          unit: ing.unit ?? '',
          qty: String(ing.qty),
        })),
      )
    } else {
      setForm({ type: 'made_in_batches', outputItemId: '', outputQty: '', unit: '', notes: '' })
      setLines([])
    }
    setError('')
  }, [recipe])

  const usedIds = new Set(lines.map((l) => l.itemId))
  const availableItems = items.filter((item) => item.id !== Number(form.outputItemId) && !usedIds.has(item.id))
  const selectedOutput = items.find((item) => item.id === Number(form.outputItemId))
  const unitOptions = [...new Set(items.map((item) => item.unit).filter(Boolean))]

  function selectOutput(option) {
    setForm((prev) => ({
      ...prev,
      outputItemId: option ? option.id : '',
      unit: option ? option.unit : prev.unit,
    }))
  }

  function addIngredient(option) {
    setLines((prev) => [
      ...prev,
      {
        key: keyRef.current++,
        itemId: option.id,
        itemName: option.name,
        sku: option.sku,
        unit: option.unit ?? '',
        qty: '',
      },
    ])
    setInputValue('')
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const q = inputValue.trim().toLowerCase()
    const match = availableItems.find(
      (item) => item.name.toLowerCase() === q || item.sku.toLowerCase() === q,
    )
    if (match) addIngredient(match)
  }

  function updateLine(key, patch) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function removeLine(key) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const filled = lines.filter((l) => Number(l.qty) > 0)
  const isMadeToOrder = form.type === 'made_to_order'
  const outputQtyOk = isMadeToOrder || Number(form.outputQty) > 0
  const canSave = selectedOutput && outputQtyOk && filled.length > 0

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      await onSave({
        type: form.type,
        outputItemId: Number(selectedOutput.id),
        outputQty: isMadeToOrder ? null : Number(form.outputQty),
        outputUnit: form.unit && form.unit !== selectedOutput.unit ? form.unit : null,
        notes: form.notes.trim() || null,
        ingredients: filled.map((l) => {
          const itemUnit = items.find((i) => i.id === l.itemId)?.unit
          return {
            itemId: Number(l.itemId),
            qty: Number(l.qty),
            unit: l.unit && l.unit !== itemUnit ? l.unit : null,
          }
        }),
      })
    } catch (err) {
      setError(err.message || 'Failed to save recipe')
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
            maxWidth: { xs: '100%', sm: 600 },
            maxHeight: { xs: '100dvh', sm: '88vh' },
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
            {recipe ? 'Edit recipe' : 'New recipe'}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: isMadeToOrder ? '1fr' : '1fr 205px', gap: 1 }}>
          <Autocomplete
            size="small"
            options={items}
            getOptionLabel={(option) => (option.sku ? `${option.name} (${option.sku})` : option.name)}
            value={selectedOutput ?? null}
            onChange={(_, option) => selectOutput(option)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                size="small"
                label="Select item *"
                sx={inputSx}
              />
            )}
          />
          {!isMadeToOrder && (
            <Box>
              <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                Batch output qty *
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StepperInput
                  value={form.outputQty}
                  onChange={(v) => setForm((prev) => ({ ...prev, outputQty: v }))}
                />
                <Autocomplete
                  size="small"
                  freeSolo
                  options={unitOptions}
                  value={form.unit || ''}
                  inputValue={form.unit || ''}
                  onInputChange={(_, value) => setForm((prev) => ({ ...prev, unit: value }))}
                  onChange={(_, value) => setForm((prev) => ({ ...prev, unit: value ?? '' }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      size="small"
                      title="Unit (defaults to the item's unit)"
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
          )}
        </Box>

        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', mt: 0.5 }}>
          Recipe type
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={form.type}
          onChange={(_, value) => {
            if (value) setForm((prev) => ({ ...prev, type: value }))
          }}
        >
          <ToggleButton value="made_to_order" sx={{ fontSize: '0.72rem', textTransform: 'none' }}>
            Made to order
          </ToggleButton>
          <ToggleButton value="made_in_batches" sx={{ fontSize: '0.72rem', textTransform: 'none' }}>
            Made in batches
          </ToggleButton>
        </ToggleButtonGroup>

        <Box>
          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
            Note
          </Typography>
          <RichTextEditor
            value={form.notes}
            onChange={(html) => setForm((prev) => ({ ...prev, notes: html }))}
            minHeight={70}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }}>
            Ingredients
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary', flexShrink: 0 }}>
            {isMadeToOrder ? 'per 1 unit' : 'per one batch'}
          </Typography>
          <Autocomplete
            size="small"
            options={availableItems}
            getOptionLabel={(option) => (option.sku ? `${option.name} (${option.sku})` : option.name)}
            value={null}
            inputValue={inputValue}
            onInputChange={(_, value) => setInputValue(value)}
            onChange={(_, option) => {
              if (option) addIngredient(option)
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

        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.4, px: 0.75, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '40%' }}>Ingredient</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '25%' }}>Unit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '25%' }}>
                Qty
              </TableCell>
              <TableCell sx={{ width: '10%' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line.itemName}
                </TableCell>
                <TableCell>
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={unitOptions}
                    value={line.unit || ''}
                    inputValue={line.unit || ''}
                    onInputChange={(_, value) => updateLine(line.key, { unit: value })}
                    onChange={(_, value) => updateLine(line.key, { unit: value ?? '' })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        size="small"
                        title="Unit (defaults to the item's unit)"
                        sx={{
                          '& .MuiInputBase-input': { fontSize: '0.72rem' },
                          '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
                        }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell align="right">
                  <StepperInput
                    value={line.qty}
                    onChange={(v) => updateLine(line.key, { qty: v })}
                    step={isMadeToOrder ? 1 : 0.5}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => removeLine(line.key)} title="Remove">
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  No ingredients yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

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
        <Button size="small" variant="contained" color="primary" onClick={handleSubmit} disabled={!canSave || saving}>
          {saving ? 'Saving...' : 'Save Recipe'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RecipeDetailDialog({ recipe, onClose, onEdit }) {
  const isMadeToOrder = recipe?.type === 'made_to_order'
  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            margin: 0,
            width: { xs: '100%', sm: 480 },
            maxWidth: { xs: '100%', sm: 480 },
            maxHeight: { xs: '100dvh', sm: '88vh' },
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1 },
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {recipe?.outputItemName}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
              {recipe?.outputSku ? `SKU ${recipe.outputSku} · ` : ''}
              {isMadeToOrder ? 'Made to order' : 'Made in batches'}
              {recipe?.outputQty != null ? ` · ${recipe.outputQty} ${recipe.outputUnit || ''}` : ''}
            </Typography>
          </Box>
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
        sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}
      >
        {recipe?.notes && <RichNote html={recipe.notes} />}

        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          Ingredients {isMadeToOrder ? '(per 1 unit)' : '(per one batch)'}
        </Typography>
        <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.4, px: 0.75, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Ingredient</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '22%' }}>Unit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '20%' }}>
                Qty
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(recipe?.ingredients ?? []).map((ing) => (
              <TableRow key={ing.id}>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ing.itemName}
                </TableCell>
                <TableCell>{ing.unit || '—'}</TableCell>
                <TableCell align="right">{ing.qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.secondary', display: 'block' }}>
              Runs
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
              {recipe?.batchCount ?? 0}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.secondary', display: 'block' }}>
              Created
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
              {recipe?.createdAt ? new Date(recipe.createdAt).toLocaleString() : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.secondary', display: 'block' }}>
              Last updated
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
              {recipe?.updatedAt ? new Date(recipe.updatedAt).toLocaleString() : '—'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Close
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => {
            onClose()
            onEdit()
          }}
        >
          Edit Recipe
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Recipes() {
  const showToast = useToast()
  const [recipes, setRecipes] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  useEffect(() => {
    let active = true
    setLoading(true)
    listRecipes()
      .then((rows) => {
        if (active) {
          setRecipes(rows)
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
  }, [])

  useEffect(() => {
    let active = true
    listItems()
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.outputItemName || '').toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.itemName.toLowerCase().includes(q)),
    )
  }, [recipes, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  async function refresh() {
    const rows = await listRecipes()
    setRecipes(rows)
  }

  async function handleSave(data) {
    if (editing) {
      await updateRecipe(editing.id, data)
      showToast('Recipe updated')
    } else {
      await createRecipe(data)
      showToast('Recipe created')
    }
    setDialogOpen(false)
    setEditing(null)
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteRecipe(confirmDelete.id)
      showToast('Recipe deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete recipe', 'error')
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search recipes"
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
            New Recipe
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
            minWidth: 720,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '22%' }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '16%' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '22%' }}>Batch size</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ingredients</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '10%' }}>
                Runs
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  onClick={() => setViewing(r)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.outputItemName}
                  </TableCell>
                  <TableCell>
                    {r.type === 'made_to_order' ? 'Made to order' : 'Made in batches'}
                  </TableCell>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.outputQty == null ? (
                      <span style={{ color: '#6b7280' }}>per order</span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>
                        {r.outputQty} {r.outputUnit || ''}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <IngredientCell recipe={r} />
                  </TableCell>
                  <TableCell align="right">{r.batchCount}</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing(r)
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
                          setConfirmDelete(r)
                        }}
                      >
                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No recipes yet. Create one to start producing.</TableCell>
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
        <RecipeDialog
          recipe={editing}
          items={items}
          onSave={handleSave}
          onClose={() => {
            setDialogOpen(false)
            setEditing(null)
          }}
        />
      )}

      {viewing && (
        <RecipeDetailDialog
          recipe={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing)
            setDialogOpen(true)
          }}
        />
      )}

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete recipe
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            Delete <b>{confirmDelete?.name}</b>? Recipes that have already been run cannot be deleted.
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

export default Recipes
