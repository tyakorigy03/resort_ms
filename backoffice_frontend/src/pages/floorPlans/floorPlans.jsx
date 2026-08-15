import { useEffect, useRef, useState } from 'react'
import {
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import {
  createFloorPlan,
  createTable,
  deleteFloorPlan,
  deleteTable,
  listFloorPlans,
  listTables,
  updateFloorPlan,
  updateTable,
} from '../../api/floorPlans'
import { listOutlets } from '../../api/outlets'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

const CANVAS_W = 1000
const CANVAS_H = 600
const TABLE_SIZES = { square: { w: 64, h: 64 }, rectangle: { w: 96, h: 56 }, circle: { w: 60, h: 60 } }

const STATUS_COLORS = {
  available: 'success.main',
  seated: 'primary.main',
  reserved: 'warning.main',
}

function PlanDialog({ plan = null, outlets, onSave, onClose }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    outletId: plan?.outletId ?? '',
    sortOrder: plan?.sortOrder ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    if (!form.outletId) {
      setError('Outlet is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: form.name.trim(),
        outletId: Number(form.outletId),
        sortOrder: Number(form.sortOrder) || 0,
      })
    } catch (err) {
      setError(err.message || 'Failed to save floor plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 380, maxWidth: 380 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {plan ? 'Edit floor plan' : 'New floor plan'}
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
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          sx={inputSx}
        />
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Outlet</InputLabel>
          <Select
            label="Outlet"
            value={form.outletId}
            onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            {outlets.map((outlet) => (
              <MenuItem key={outlet.id} value={outlet.id}>
                {outlet.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          variant="standard"
          size="small"
          label="Sort order"
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          sx={inputSx}
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

function TableDialog({ table, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    label: table?.label ?? '',
    seats: table?.seats ?? 4,
    shape: table?.shape ?? 'square',
    status: table?.status ?? 'available',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.label.trim()) {
      setError('Label is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        label: form.label.trim(),
        seats: Number(form.seats) || 4,
        shape: form.shape,
        status: form.status,
      })
    } catch (err) {
      setError(err.message || 'Failed to save table')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Edit table
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
          label="Label"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Seats"
          type="number"
          value={form.seats}
          onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}
          sx={inputSx}
        />
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Shape</InputLabel>
          <Select
            label="Shape"
            value={form.shape}
            onChange={(e) => setForm((f) => ({ ...f, shape: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="square">Square</MenuItem>
            <MenuItem value="rectangle">Rectangle</MenuItem>
            <MenuItem value="circle">Circle</MenuItem>
          </Select>
        </FormControl>
        <FormControl variant="standard" size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            sx={{ '& .MuiSelect-select': { fontSize: '0.78rem' } }}
          >
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="seated">Seated</MenuItem>
            <MenuItem value="reserved">Reserved</MenuItem>
          </Select>
        </FormControl>
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between' }}>
        {onDelete ? (
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={async () => {
              try {
                await onDelete()
              } catch (err) {
                setError(err.message || 'Failed to delete table')
              }
            }}
          >
            Delete
          </Button>
        ) : (
          <Box />
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

function fallbackPos(index) {
  const perRow = 6
  return { x: 60 + (index % perRow) * 150, y: 60 + Math.floor(index / perRow) * 130 }
}

function PlanEditor({ plan, onBack, onChanged }) {
  const showToast = useToast()
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [editTable, setEditTable] = useState(null)
  const [confirmDeleteTable, setConfirmDeleteTable] = useState(null)

  useEffect(() => {
    let active = true
    listTables(plan.id)
      .then((rows) => {
        if (active) setTables(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [plan.id])

  function refresh() {
    return listTables(plan.id).then(setTables)
  }

  function tableRect(table, index) {
    const size = TABLE_SIZES[table.shape] || TABLE_SIZES.square
    if (table.posX === null || table.posY === null) {
      const pos = fallbackPos(index, tables.length)
      return { ...size, x: pos.x, y: pos.y }
    }
    return { ...size, x: table.posX, y: table.posY }
  }

  function handlePointerDown(e, table, index) {
    if (e.button !== 0) return
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const t = tableRect(table, index)
    dragRef.current = {
      id: table.id,
      offsetX: e.clientX - rect.left - t.x,
      offsetY: e.clientY - rect.top - t.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e, index) {
    const drag = dragRef.current
    if (!drag) return
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const size = TABLE_SIZES[tables[index].shape] || TABLE_SIZES.square
    const x = Math.min(Math.max(e.clientX - rect.left - drag.offsetX, 0), CANVAS_W - size.w)
    const y = Math.min(Math.max(e.clientY - rect.top - drag.offsetY, 0), CANVAS_H - size.h)
    if (Math.abs(e.clientX - rect.left - drag.offsetX - (tables[index].posX ?? 0)) > 3) drag.moved = true
    if (Math.abs(e.clientY - rect.top - drag.offsetY - (tables[index].posY ?? 0)) > 3) drag.moved = true
    setTables((prev) => prev.map((t) => (t.id === drag.id ? { ...t, posX: x, posY: y } : t)))
  }

  async function handlePointerUp() {
    const drag = dragRef.current
    if (!drag) return
    const table = tables.find((t) => t.id === drag.id)
    dragRef.current = null
    if (!table) return
    if (!drag.moved) {
      setEditTable(table)
      return
    }
    try {
      await updateTable(table.id, {
        label: table.label,
        seats: table.seats,
        shape: table.shape,
        status: table.status,
        posX: table.posX,
        posY: table.posY,
      })
      showToast('Table moved')
      await refresh()
      onChanged()
    } catch (err) {
      showToast(err.message || 'Failed to move table', 'error')
      await refresh()
    }
  }

  async function handleAddTable() {
    try {
      await createTable({ floorPlanId: plan.id, seats: 4, shape: 'square', posX: CANVAS_W / 2 - 32, posY: CANVAS_H / 2 - 32 })
      showToast('Table added')
      await refresh()
      onChanged()
    } catch (err) {
      showToast(err.message || 'Failed to add table', 'error')
    }
  }

  async function handleSaveTable(data) {
    await updateTable(editTable.id, { ...data, posX: editTable.posX, posY: editTable.posY })
    showToast('Table updated')
    setEditTable(null)
    await refresh()
    onChanged()
  }

  async function handleDeleteTable() {
    await deleteTable(confirmDeleteTable.id)
    showToast('Table deleted')
    setConfirmDeleteTable(null)
    setEditTable(null)
    await refresh()
    onChanged()
  }

  return (
    <Card>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <IconButton size="small" onClick={onBack} title="Back to floor plans">
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {plan.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {plan.outletName} · {tables.length} tables · {plan.totalSeats} seats
            </Typography>
          </Box>
          <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={handleAddTable}>
            Add table
          </Button>
        </Box>

        <Box
          ref={canvasRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: CANVAS_H,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'grey.50',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {loading ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
              Loading...
            </Typography>
          ) : (
            tables.map((table, index) => {
              const t = tableRect(table, index)
              const color = STATUS_COLORS[table.status] || 'text.secondary'
              return (
                <Box
                  key={table.id}
                  onPointerDown={(e) => handlePointerDown(e, table, index)}
                  onPointerMove={(e) => handlePointerMove(e, index)}
                  onPointerUp={handlePointerUp}
                  sx={{
                    position: 'absolute',
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    border: '2px solid',
                    borderColor: color,
                    borderRadius: table.shape === 'circle' ? '50%' : 2,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', lineHeight: 1.1 }}>{table.label}</Typography>
                  <Typography sx={{ fontSize: '0.62rem', lineHeight: 1.1, color: 'text.secondary' }}>
                    {table.seats} seats
                  </Typography>
                </Box>
              )
            })
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Drag a table to position it. Click a table to edit its label, seats, shape or status.
        </Typography>
      </CardContent>

      {editTable && (
        <TableDialog
          table={editTable}
          onSave={handleSaveTable}
          onDelete={() => setConfirmDeleteTable(editTable)}
          onClose={() => setEditTable(null)}
        />
      )}

      <Dialog
        open={!!confirmDeleteTable}
        onClose={() => setConfirmDeleteTable(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete table
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDeleteTable?.label}"? Open sessions on this table will keep working, but the table is removed
            from the floor plan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setConfirmDeleteTable(null)}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={async () => {
              try {
                await handleDeleteTable()
              } catch {
                setConfirmDeleteTable(null)
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

function FloorPlans() {
  const showToast = useToast()
  const [plans, setPlans] = useState([])
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, plan: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([listFloorPlans(), listOutlets()])
      .then(([planRows, outletRows]) => {
        if (active) {
          setPlans(planRows)
          setOutlets(outletRows)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    const [planRows, outletRows] = await Promise.all([listFloorPlans(), listOutlets()])
    setPlans(planRows)
    setOutlets(outletRows)
  }

  async function handleSave(data) {
    if (dialog.plan) {
      await updateFloorPlan(dialog.plan.id, data)
      showToast('Floor plan updated')
    } else {
      await createFloorPlan(data)
      showToast('Floor plan created')
    }
    setDialog({ open: false, plan: null })
    await refresh()
  }

  async function handleDelete() {
    try {
      await deleteFloorPlan(confirmDelete.id)
      showToast('Floor plan deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete floor plan', 'error')
      setConfirmDelete(null)
    }
  }

  if (editing) {
    return (
      <PlanEditor
        plan={editing}
        onBack={() => setEditing(null)}
        onChanged={() => {
          listFloorPlans().then(setPlans)
        }}
      />
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Floor plans
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, plan: null })}
          >
            New Floor Plan
          </Button>
        </Box>

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
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Outlet</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Tables</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Seats</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Sort order</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id} hover onClick={() => setEditing(plan)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 500 }}>{plan.name}</TableCell>
                  <TableCell>{plan.outletName || '—'}</TableCell>
                  <TableCell>{plan.tableCount}</TableCell>
                  <TableCell>{plan.totalSeats}</TableCell>
                  <TableCell>{plan.sortOrder}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Edit floor plan"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDialog({ open: true, plan })
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(plan)
                      }}
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && plans.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableRestaurantIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    No floor plans yet. Create one to start arranging tables.
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <PlanDialog
          plan={dialog.plan}
          outlets={outlets}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, plan: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete floor plan
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}"? All of its tables are removed too.
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
    </Card>
  )
}

export default FloorPlans
