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
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import GroupsIcon from '@mui/icons-material/Groups'
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
  const [detailItem, setDetailItem] = useState(null)
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

  // Initial context: seated table session (and its open order) coming from the
  // Tables screen. Pickup/delivery orders are created inline on demand.
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
        { itemId: item.id, quantity: 1, courseId: activeCourseId || order.courses[0]?.id },
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

  async function handleQty(item, qty) {
    if (qty < 1) return
    if (qty === item.quantity) return
    setBusy(true)
    setError(null)
    try {
      // Backend has no quantity-edit endpoint, so edit in place by removing the
      // line and re-adding it at the new quantity (same course + seat).
      await api.removeItem(order.id, item.id)
      const updated = await api.addItems(order.id, [
        { itemId: item.itemId, quantity: qty, courseId: item.courseId, seatNumber: item.seatNumber },
      ])
      setOrder(updated)
      setDetailItem(null)
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
      <Chip
        icon={<AddIcon />}
        label="New"
        variant="outlined"
        onClick={openEmptyRegister}
      />
    </Box>
  )

  // Empty register: nothing selected yet.
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
              <Button
                variant="contained"
                startIcon={<TableRestaurantIcon />}
                onClick={() => navigate('/tables')}
              >
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

      {/* Order tabs */}
      {tabsBar}

      <Paper variant="outlined" sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TableRestaurantIcon color="primary" />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {order.tableLabel ? `Table ${order.tableLabel}` : order.collectionCode ? `Code ${order.collectionCode}` : order.orderType}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
            {order.orderNumber} · {order.status}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {order.covers && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
              Covers
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {order.covers}
            </Typography>
          </Box>
        )}
        {order.staffName && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
              Served by
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {order.staffName}
            </Typography>
          </Box>
        )}
        {order.customerName && (
          <Chip icon={<PersonIcon />} label={order.customerName} color="success" variant="outlined" size="small" />
        )}
      </Paper>

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: 1.5 }}>
        {/* Left: course tabs + item grid + current course lines */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', overflowX: 'auto' }}>
            {order.courses.map((c) => (
              <Chip
                key={c.id}
                label={c.firedAt ? `${c.name} ✓` : c.name}
                color={activeCourseId === c.id ? 'fire' : 'default'}
                variant={activeCourseId === c.id ? 'filled' : 'outlined'}
                onClick={() => setActiveCourseId(c.id)}
              />
            ))}
            <Chip icon={<AddIcon />} label="Add a course" variant="outlined" onClick={handleAddCourse} disabled={busy} />
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
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
            {categories.map((c) => (
              <Chip
                key={c}
                label={c}
                color={category === c ? 'primary' : 'default'}
                variant={category === c ? 'filled' : 'outlined'}
                onClick={() => setCategory(c)}
                size="small"
                sx={{ textTransform: 'capitalize', flexShrink: 0 }}
              />
            ))}
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              minHeight: 140,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
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

          <Paper variant="outlined" sx={{ minHeight: 0, maxHeight: 220, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, p: 1, pb: 0.5 }}>
              {activeCourse?.name || 'Items'} {activeCourse?.firedAt ? '· sent to kitchen' : ''}
            </Typography>
            {(activeCourse?.items || []).map((line) => (
              <OrderLine key={line.id} line={line} onClick={() => setDetailItem(line)} />
            ))}
            {unassignedItems.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, p: 1, pb: 0.5 }}>
                  Before first course
                </Typography>
                {unassignedItems.map((line) => (
                  <OrderLine key={line.id} line={line} onClick={() => setDetailItem(line)} />
                ))}
              </>
            )}
            {activeCourse?.items?.length === 0 && unassignedItems.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1, pt: 0.5 }}>
                No items in this course yet.
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Right: course actions + order actions + pay */}
        <Paper variant="outlined" sx={{ width: 330, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {activeCourse?.name || 'Order'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {lineCount} items
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
            <Button
              fullWidth
              size="large"
              color="fire"
              variant="contained"
              disabled={busy || !activeCourse || activeCourse.firedAt || activeCourse.items.length === 0}
              onClick={handleFireCourse}
              startIcon={<LocalFireDepartmentIcon />}
              sx={{ mb: 1.5, fontSize: 16, py: 1.5 }}
            >
              {activeCourse?.firedAt ? 'Course sent' : 'Fire course'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<CallSplitIcon />}
              disabled={busy}
              onClick={handleSplit}
              sx={{ mb: 1.5, textTransform: 'none' }}
            >
              Split Check
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<GroupsIcon />}
              disabled={busy}
              onClick={() => setDialog('customer')}
              sx={{ mb: 1.5, textTransform: 'none' }}
            >
              Assign customer
            </Button>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {money(subtotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body1">Total</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {money(subtotal)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              size="large"
              color="success"
              variant="contained"
              disabled={busy}
              onClick={() => setDialog('checkout')}
              sx={{ fontSize: 17, py: 1.5 }}
            >
              Pay - $${money(subtotal)}
            </Button>
          </Box>
        </Paper>
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

function OrderLine({ line, onClick }) {
  const cancelled = line.kdsStatus === 'cancelled'
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 1,
        alignItems: 'center',
        px: 1.25,
        py: 0.75,
        borderBottom: '1px dashed',
        borderColor: 'divider',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
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
