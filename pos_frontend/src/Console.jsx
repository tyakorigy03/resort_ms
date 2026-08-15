import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { api } from './api'
import { useShell } from './PosShell'
import { money } from './format'
import CheckoutDialog from './components/CheckoutDialog'
import Receipt from './components/Receipt'
import CustomerDialog from './components/CustomerDialog'
import ItemDetailDialog from './components/ItemDetailDialog'

// Spec 3.4 register: 3 columns (order ticket + keypad + actions | categories |
// seats + items) over a bottom action bar (Send | Fire course | Split Check |
// Pay). Header shows the table/customer context.
export default function Console() {
  const { myShift, refresh } = useShell()
  const navigate = useNavigate()
  const location = useLocation()

  const [openOrders, setOpenOrders] = useState([])
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [activeSeat, setActiveSeat] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [selectedLineId, setSelectedLineId] = useState(null)
  const [qtyInput, setQtyInput] = useState('')
  const [editAnchor, setEditAnchor] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .items()
      .then((list) => setItems(list.filter((i) => i.mainPrice !== null && i.mainPrice !== undefined)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function refreshOpenOrders() {
    try {
      const list = await api.posOrders({ status: 'open' })
      setOpenOrders(list)
      return list
    } catch (err) {
      setError(err.message)
      return []
    }
  }

  useEffect(() => {
    refreshOpenOrders()
  }, [])

  useEffect(() => {
    const state = location.state
    if (!state) return
    if (state.orderId) {
      setActiveOrderId(state.orderId)
    } else if (state.sessionId) {
      ;(async () => {
        try {
          const created = await api.createOrder({
            tableSessionId: state.sessionId,
            staffId: myShift?.staffId || null,
            covers: null,
          })
          setActiveOrderId(created.id)
        } catch (err) {
          setError(err.message)
        }
      })()
    }
    window.history.replaceState({}, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  async function loadOrder(id) {
    setBusy(true)
    setError(null)
    try {
      const o = await api.posOrder(id)
      setOrder(o)
      if (o.status !== 'open') {
        setActiveOrderId(null)
        setOrder(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!activeOrderId) {
      setOrder(null)
      setActiveCourseId(null)
      return
    }
    loadOrder(activeOrderId)
  }, [activeOrderId])

  useEffect(() => {
    if (order?.courses?.length && !activeCourseId) {
      setActiveCourseId(order.courses[0].id)
    }
  }, [order])

  const activeCourse = useMemo(() => {
    if (!order || !activeCourseId) return null
    return order.courses.find((c) => c.id === activeCourseId) || null
  }, [order, activeCourseId])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.accountingGroup).filter(Boolean))
    return ['all', ...set]
  }, [items])

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (category !== 'all' && i.accountingGroup !== category) return false
      if (q && !i.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, category, search])

  const unassignedItems = order?.unassignedItems || []
  const subtotal = order?.subtotal || 0
  const lineCount =
    (order?.courses || []).reduce((s, c) => s + (c.items || []).length, 0) +
    (order?.unassignedItems || []).length

  async function addItem(item) {
    if (!order) return
    setError(null)
    try {
      const updated = await api.addItems(order.id, [
        {
          itemId: item.id,
          quantity: 1,
          courseId: activeCourseId || order.courses[0]?.id,
          seatNumber: activeSeat || undefined,
        },
      ])
      setOrder(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  async function switchOrder(id) {
    setActiveOrderId(id)
    setActiveCourseId(null)
  }

  function openEmptyRegister() {
    setActiveOrderId(null)
    navigate('/register', { replace: true, state: null })
  }

  async function startTakeaway() {
    setBusy(true)
    setError(null)
    try {
      const created = await api.createOrder({
        orderType: 'pickup',
        staffId: myShift?.staffId || null,
      })
      setActiveOrderId(created.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleFireCourse() {
    if (!order || !activeCourseId) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api.fireCourse(order.id, activeCourseId)
      setOrder(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAddCourse() {
    if (!order) return
    setEditAnchor(null)
    setBusy(true)
    setError(null)
    try {
      const updated = await api.addCourse(order.id)
      setOrder(updated)
      setActiveCourseId(updated.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleHold() {
    if (!order || !activeCourse) return
    setBusy(true)
    setError(null)
    try {
      const next = activeCourse.status === 'on_hold' ? 'new' : 'on_hold'
      const updated = await api.setCourseStatus(order.id, activeCourse.id, next)
      setOrder(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleOrderType(type) {
    if (!order) return
    setEditAnchor(null)
    setBusy(true)
    setError(null)
    try {
      const updated = await api.updateOrder(order.id, { orderType: type })
      setOrder(updated)
      refreshOpenOrders()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSplit() {
    if (!order) return
    setBusy(true)
    setError(null)
    try {
      const orders = await api.splitCheck(order.id)
      setOrder(orders[0])
      setActiveCourseId(orders[0].courses[0]?.id)
      refreshOpenOrders()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCustomer(customer) {
    if (!order) return
    setDialog(null)
    setBusy(true)
    setError(null)
    try {
      const updated = await api.updateOrder(order.id, { customerId: customer.id })
      setOrder(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleQty(line, qty) {
    if (qty < 0.5) return
    if (qty === line.quantity) return
    setBusy(true)
    setError(null)
    try {
      await api.removeItem(order.id, line.id)
      const updated = await api.addItems(order.id, [
        { itemId: line.itemId, quantity: qty, courseId: line.courseId, seatNumber: line.seatNumber },
      ])
      setOrder(updated)
      setDetailItem(null)
      setSelectedLineId(null)
      setQtyInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSeat(item, seatNumber) {
    setBusy(true)
    setError(null)
    try {
      const updated = await api.moveItem(order.id, item.id, { seatNumber })
      setOrder(updated)
      setDetailItem(findLine(updated, item.id) || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCourse(item, courseId) {
    setBusy(true)
    setError(null)
    try {
      const updated = await api.moveItem(order.id, item.id, { courseId })
      setOrder(updated)
      setDetailItem(findLine(updated, item.id) || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRefund(item) {
    setBusy(true)
    setError(null)
    try {
      const updated = await api.refundItem(order.id, item.id)
      setOrder(updated)
      setDetailItem(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(item) {
    setBusy(true)
    setError(null)
    try {
      const updated = await api.removeItem(order.id, item.id)
      setOrder(updated)
      setDetailItem(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onPaid(paid) {
    setReceipt(paid)
    setDialog(null)
    setOrder(null)
    setActiveOrderId(null)
    setActiveCourseId(null)
    refresh()
    refreshOpenOrders()
  }

  // Keypad (spec: C . <-- / 7 8 9 / 4 5 6 / 1 2 3 / 00 0 x) edits the quantity
  // of the selected order line; 'x' applies it.
  function onKeypad(key) {
    if (key === 'clear') return setQtyInput('')
    if (key === 'back') return setQtyInput((q) => q.slice(0, -1))
    if (key === 'x') return applyQty()
    setQtyInput((q) => {
      if (q.includes('.') && key === '.') return q
      const next = q + key
      if (next.length > 4) return q
      const [int, dec] = next.split('.')
      if (dec && dec.length > 2) return q
      if (int && int.length > 2) return q
      return next
    })
  }

  function applyQty() {
    const line = selectedLineId ? findLine(order, selectedLineId) : null
    if (!line) return
    const qty = parseFloat(qtyInput)
    if (!qty || Number.isNaN(qty)) return
    handleQty(line, qty)
  }

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  const tabsBar = (
    <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.25 }}>
      {openOrders.map((o) => (
        <Chip
          key={o.id}
          label={o.id === order?.id ? `${o.orderNumber} · ${o.tableLabel || o.collectionCode || o.orderType}` : `${o.tableLabel || o.collectionCode || o.orderNumber}`}
          color={o.id === order?.id ? 'primary' : 'default'}
          variant={o.id === order?.id ? 'filled' : 'outlined'}
          onClick={() => switchOrder(o.id)}
        />
      ))}
      <Chip icon={<AddIcon />} label="New" variant="outlined" onClick={openEmptyRegister} />
    </Box>
  )

  if (!order) {
    return (
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1.5 }}>
        {error && (
          <Alert
            severity="error"
            sx={{ fontSize: '0.85rem' }}
            action={
              <IconButton size="small" onClick={() => setError(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}
        {tabsBar}
        <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center' }}>
          <Paper variant="outlined" sx={{ p: 4, maxWidth: 420, textAlign: 'center' }}>
            <StorefrontIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              No order selected
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Seat a table to start a dine-in order, or start a takeaway directly.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="contained" startIcon={<TableRestaurantIcon />} onClick={() => navigate('/tables')}>
                Seat a table
              </Button>
              <Button variant="outlined" onClick={startTakeaway} disabled={busy}>
                Start a takeaway
              </Button>
            </Box>
          </Paper>
        </Box>
        <Receipt order={receipt} onClose={() => setReceipt(null)} />
      </Box>
    )
  }

  const headerTitle = order.customerName
    ? order.customerName
    : order.tableLabel
      ? `Table ${order.tableLabel}`
      : order.collectionCode
        ? `Code ${order.collectionCode}`
        : order.orderType

  const maxSeat = order.covers || 8
  const seatCount = Math.max(maxSeat, 1)

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1 }}>
      {error && (
        <Alert
          severity="error"
          sx={{ fontSize: '0.85rem' }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {tabsBar}

      {/* Header (spec 3.4): table / customer context */}
      <Paper variant="outlined" sx={{ px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton size="small" onClick={() => navigate('/tables')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'capitalize' }}>
          {headerTitle}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {order.covers ? (
          <Chip size="small" label={`${order.covers} covers`} />
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {order.orderNumber}
        </Typography>
        {order.customerName && <Chip icon={<PersonIcon />} label={order.customerName} color="success" variant="outlined" size="small" />}
      </Paper>

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: 1 }}>
        {/* Left: ticket + keypad + actions */}
        <Paper variant="outlined" sx={{ width: 320, minWidth: 320, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', px: 1, pt: 1, overflowX: 'auto', flexShrink: 0 }}>
            {order.courses.map((c) => (
              <Chip
                key={c.id}
                size="small"
                label={c.firedAt ? `${c.name} ✓` : c.name}
                color={activeCourseId === c.id ? 'fire' : 'default'}
                variant={activeCourseId === c.id ? 'filled' : 'outlined'}
                onClick={() => setActiveCourseId(c.id)}
              />
            ))}
            <Chip size="small" icon={<AddIcon />} label="+" variant="outlined" onClick={handleAddCourse} disabled={busy} />
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', px: 1, py: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', px: 0.5, pt: 0.5 }}>
              {activeCourse?.name || 'Items'} {activeCourse?.firedAt ? '· sent to kitchen' : ''}
              {activeCourse?.status === 'on_hold' ? ' · on hold' : ''}
            </Typography>
            {(activeCourse?.items || []).map((line) => (
              <OrderLine
                key={line.id}
                line={line}
                selected={line.id === selectedLineId}
                onClick={() => {
                  setDetailItem(line)
                  setSelectedLineId(line.id)
                  setQtyInput('')
                }}
              />
            ))}
            {unassignedItems.length > 0 && (
              <>
                <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', px: 0.5, pt: 1 }}>
                  Before first course
                </Typography>
                {unassignedItems.map((line) => (
                  <OrderLine
                    key={line.id}
                    line={line}
                    selected={line.id === selectedLineId}
                    onClick={() => {
                      setDetailItem(line)
                      setSelectedLineId(line.id)
                      setQtyInput('')
                    }}
                  />
                ))}
              </>
            )}
            {activeCourse?.items?.length === 0 && unassignedItems.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                No items in this course yet.
              </Typography>
            )}

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5, mb: 0.5 }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{money(subtotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5, mb: 0.5 }}>
              <Typography variant="body1">Total</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>{money(subtotal)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
              {lineCount} items
            </Typography>
          </Box>

          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Keypad onKey={onKeypad} disabled={busy} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              <Button size="small" variant="outlined" color="inherit" sx={{ textTransform: 'none' }} onClick={(e) => setEditAnchor(e.currentTarget)}>
                Edit order
              </Button>
              <Button size="small" variant="outlined" color="inherit" sx={{ textTransform: 'none' }} disabled={busy || !activeCourse} onClick={handleHold}>
                {activeCourse?.status === 'on_hold' ? 'Resume' : 'On hold'}
              </Button>
              <Button size="small" variant="outlined" color="inherit" sx={{ textTransform: 'none' }} startIcon={<TableRestaurantIcon />} onClick={() => navigate('/tables')}>
                Tables
              </Button>
              <Button size="small" variant="outlined" color="inherit" sx={{ textTransform: 'none' }} disabled={busy} onClick={() => setDialog('checkout')}>
                Credit card
              </Button>
            </Box>
            <Menu anchorEl={editAnchor} open={Boolean(editAnchor)} onClose={() => setEditAnchor(null)}>
              <MenuItem onClick={handleAddCourse}>Add a course</MenuItem>
              <MenuItem onClick={() => { setEditAnchor(null); setDialog('customer') }}>Assign customer</MenuItem>
              <Divider />
              {['dine_in', 'pickup', 'delivery'].map((type) => (
                <MenuItem key={type} selected={order.orderType === type} onClick={() => handleOrderType(type)}>
                  {type === 'dine_in' ? 'Dine-in' : type === 'pickup' ? 'Pickup' : 'Delivery'}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Paper>

        {/* Middle: categories */}
        <Paper variant="outlined" sx={{ width: 230, minWidth: 230, p: 1, overflowY: 'auto' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, px: 0.5 }}>Categories</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mt: 0.5 }}>
            {categories.map((c) => (
              <Button
                key={c}
                size="small"
                variant={category === c ? 'contained' : 'outlined'}
                color={category === c ? 'primary' : 'inherit'}
                onClick={() => setCategory(c)}
                sx={{ textTransform: 'capitalize', fontSize: 12, minHeight: 44, px: 0.5 }}
              >
                {c === 'all' ? 'All' : c}
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Right: seats + search + items */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', pb: 0.25 }}>
            <Chip
              label="All seats"
              size="small"
              color={activeSeat === null ? 'primary' : 'default'}
              variant={activeSeat === null ? 'filled' : 'outlined'}
              onClick={() => setActiveSeat(null)}
            />
            {Array.from({ length: seatCount }, (_, i) => i + 1).map((n) => (
              <Chip
                key={n}
                label={`Seat ${n}`}
                size="small"
                color={activeSeat === n ? 'primary' : 'default'}
                variant={activeSeat === n ? 'filled' : 'outlined'}
                onClick={() => setActiveSeat(n)}
              />
            ))}
          </Box>

          <TextField
            size="small"
            fullWidth
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box
            sx={{
              flexGrow: 1,
              minHeight: 140,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              alignContent: 'start',
              gap: 1,
            }}
          >
            {visibleItems.map((item) => (
              <Button
                key={item.id}
                variant="outlined"
                color="inherit"
                onClick={() => addItem(item)}
                disabled={busy}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  minHeight: 82,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'left' }}>
                  {item.name}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'success.main', fontWeight: 700 }}>
                  {money(item.mainPrice)}
                </Typography>
              </Button>
            ))}
            {visibleItems.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No items match.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Bottom action bar (spec 3.4) */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          color="inherit"
          disabled={busy || !selectedLineId}
          onClick={applyQty}
          sx={{ minWidth: 150, fontSize: 15, fontWeight: 700, textTransform: 'none' }}
        >
          Send
        </Button>
        <Button
          variant="contained"
          color="fire"
          disabled={busy || !activeCourse || activeCourse.firedAt || activeCourse.items.length === 0}
          onClick={handleFireCourse}
          startIcon={<LocalFireDepartmentIcon />}
          sx={{ minWidth: 160, fontSize: 15, fontWeight: 700, textTransform: 'none' }}
        >
          {activeCourse?.firedAt ? 'Course sent' : 'Fire course'}
        </Button>
        <Button
          variant="contained"
          color="inherit"
          disabled={busy}
          onClick={handleSplit}
          startIcon={<CallSplitIcon />}
          sx={{ minWidth: 160, fontSize: 15, fontWeight: 700, textTransform: 'none' }}
        >
          Split Check
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={busy}
          onClick={() => setDialog('checkout')}
          sx={{ flexGrow: 1, fontSize: 16, fontWeight: 800, textTransform: 'none' }}
        >
          Pay - ${money(subtotal)}
        </Button>
      </Box>

      <CheckoutDialog
        open={dialog === 'checkout'}
        onClose={() => setDialog(null)}
        order={order}
        onPaid={onPaid}
      />
      <CustomerDialog open={dialog === 'customer'} onClose={() => setDialog(null)} onSelect={handleCustomer} />
      <ItemDetailDialog
        open={Boolean(detailItem)}
        item={detailItem}
        courses={order.courses}
        covers={order.covers}
        busy={busy}
        onClose={() => setDetailItem(null)}
        onQty={(qty) => handleQty(detailItem, qty)}
        onSeat={(seat) => handleSeat(detailItem, seat)}
        onCourse={(courseId) => handleCourse(detailItem, courseId)}
        onRefund={(item) => handleRefund(item)}
        onRemove={(item) => handleRemove(item)}
      />
      <Receipt order={receipt} onClose={() => setReceipt(null)} />
    </Box>
  )
}

// Spec 3.4 keypad: C . <-- / 7 8 9 / 4 5 6 / 1 2 3 / 00 0 x
function Keypad({ onKey, disabled }) {
  const rows = [
    ['C', '.', 'back'],
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['00', '0', 'x'],
  ]
  return (
    <Box>
      {rows.map((row, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {row.map((key) => (
            <Button
              key={key}
              fullWidth
              variant="outlined"
              disabled={disabled}
              onClick={() => onKey(key === 'back' ? 'back' : key)}
              sx={{ height: 38, minWidth: 0, fontSize: 14, fontWeight: 700, p: 0 }}
            >
              {key === 'back' ? '⌫' : key}
            </Button>
          ))}
        </Box>
      ))}
    </Box>
  )
}

function OrderLine({ line, onClick, selected }) {
  const cancelled = line.kdsStatus === 'cancelled'
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 1,
        alignItems: 'center',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        borderBottom: '1px dashed',
        borderColor: 'divider',
        bgcolor: selected ? 'primary.light' : 'transparent',
        cursor: 'pointer',
        '&:hover': { bgcolor: selected ? 'primary.light' : 'action.hover' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: cancelled ? 'line-through' : 'none', opacity: cancelled ? 0.6 : 1 }}>
          {line.itemName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {line.seatNumber ? `Seat ${line.seatNumber} · ` : ''}
          {line.kdsStatus === 'cancelled' ? 'refunded' : line.kdsStatus}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, opacity: cancelled ? 0.6 : 1 }}>
        ×{line.quantity}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 64, textAlign: 'right', opacity: cancelled ? 0.6 : 1 }}>
        {money(line.lineTotal)}
      </Typography>
    </Box>
  )
}

function findLine(order, id) {
  if (!order) return null
  for (const course of order.courses || []) {
    const found = (course.items || []).find((i) => i.id === id)
    if (found) return found
  }
  return (order.unassignedItems || []).find((i) => i.id === id) || null
}
