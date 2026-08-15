import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PersonIcon from '@mui/icons-material/Person'
import StorefrontIcon from '@mui/icons-material/Storefront'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import { api } from './api'
import { useShell } from './PosShell'
import { buildTheme } from './theme'
import { useThemeMode } from './ThemeModeProvider'
import { money } from './format'
import CheckoutDialog from './components/CheckoutDialog'
import Receipt from './components/Receipt'
import CustomerDialog from './components/CustomerDialog'
import ItemDetailDialog from './components/ItemDetailDialog'

export default function Console() {
  const { mode } = useThemeMode()
  const theme = useMemo(() => buildTheme(mode, { radius: 5 }), [mode])
  return (
    <ThemeProvider theme={theme}>
      <Register />
    </ThemeProvider>
  )
}

// Register (spec 3.4): the left column is the order ticket (courses + items as
// lists, only the active course expanded, Add course last), the keypad and its
// actions live beneath it, the menu feeds the ticket, and the bottom bar holds
// the order-flow actions.
function Register() {
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
    clearSelection()
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
    if (qty === line.quantity) {
      clearSelection()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.removeItem(order.id, line.id)
      const updated = await api.addItems(order.id, [
        { itemId: line.itemId, quantity: qty, courseId: line.courseId, seatNumber: line.seatNumber },
      ])
      setOrder(updated)
      setDetailItem(null)
      clearSelection()
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
    clearSelection()
    refresh()
    refreshOpenOrders()
  }

  function selectLine(line) {
    setSelectedLineId(line.id)
    setQtyInput(String(line.quantity))
  }

  function clearSelection() {
    setSelectedLineId(null)
    setQtyInput('')
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
      <Chip icon={<AddIcon />} label="New" variant="soft" onClick={openEmptyRegister} />
    </Box>
  )

  if (!order) {
    return (
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1.5 }}>
        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
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
              <Button variant="soft" onClick={startTakeaway} disabled={busy}>
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
  const fireDisabled = !activeCourse || Boolean(activeCourse.firedAt) || activeCourse.items.length === 0

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1 }}>
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {tabsBar}

      <Menu anchorEl={editAnchor} open={Boolean(editAnchor)} onClose={() => setEditAnchor(null)}>
        <MenuItem onClick={() => { setEditAnchor(null); setDialog('customer') }}>Assign customer</MenuItem>
        <Divider />
        {['dine_in', 'pickup', 'delivery'].map((type) => (
          <MenuItem key={type} selected={order.orderType === type} onClick={() => handleOrderType(type)}>
            {type === 'dine_in' ? 'Dine-in' : type === 'pickup' ? 'Pickup' : 'Delivery'}
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: 1 }}>
        {/* Left: order ticket + keypad + actions */}
        <Paper variant="outlined" sx={{ width: 360, minWidth: 360, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
            <List disablePadding dense>
              {unassignedItems.length > 0 && (
                <Box>
                  <ListSubheader disableSticky sx={{ bgcolor: 'transparent', lineHeight: '28px', fontSize: 12, fontWeight: 800 }}>
                    Before first course
                  </ListSubheader>
                  {unassignedItems.map((line) => (
                    <OrderLine
                      key={line.id}
                      line={line}
                      selected={line.id === selectedLineId}
                      onSelect={() => selectLine(line)}
                      onEdit={() => setDetailItem(line)}
                    />
                  ))}
                </Box>
              )}

              {order.courses.map((c) => {
                const isActive = c.id === activeCourseId
                const hint = c.firedAt ? 'sent to kitchen' : c.status === 'on_hold' ? 'on hold' : c.items.length ? `${c.items.length} items` : 'no items'
                return (
                  <Box key={c.id}>
                    <ListItemButton onClick={() => { setActiveCourseId(c.id); clearSelection() }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        {isActive ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={c.name}
                        secondary={hint}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <IconButton
                        size="small"
                        title="Add item to this course"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveCourseId(c.id)
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                    <Collapse in={isActive} timeout="auto" unmountOnExit>
                      <List disablePadding dense>
                        {c.items.map((line) => (
                          <OrderLine
                            key={line.id}
                            line={line}
                            selected={line.id === selectedLineId}
                            onSelect={() => selectLine(line)}
                            onEdit={() => setDetailItem(line)}
                          />
                        ))}
                      </List>
                    </Collapse>
                  </Box>
                )
              })}

              <ListItemButton onClick={handleAddCourse} disabled={busy}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Add course" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
              </ListItemButton>
            </List>
          </Box>

          <Box sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {money(subtotal)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 0.75, alignItems: 'stretch' }}>
              <Keypad onKey={onKeypad} disabled={busy} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" onClick={(e) => setEditAnchor(e.currentTarget)}>
                  Edit order
                </Button>
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" disabled={busy || !activeCourse} onClick={handleHold}>
                  {activeCourse?.status === 'on_hold' ? 'Resume' : 'On hold'}
                </Button>
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" startIcon={<TableRestaurantIcon />} onClick={() => navigate('/tables')}>
                  Tables
                </Button>
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" disabled={busy} onClick={() => setDialog('checkout')}>
                  Credit card
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Menu: current order header + category rail + seat target + items */}
        <Paper variant="outlined" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 800, lineHeight: 1.1, textTransform: 'capitalize' }}>
                  {headerTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block' }}>
                  {order.orderNumber} · {order.orderType}
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              {order.covers ? <Chip size="small" label={`${order.covers} covers`} /> : null}
              <IconButton size="small" onClick={(e) => setEditAnchor(e.currentTarget)} title="Order options">
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {order.customerName && (
                <Chip size="small" icon={<PersonIcon />} label={order.customerName} color="success" variant="soft" />
              )}
              <Button size="small" color="inherit" variant="soft" disabled={busy || !activeCourse} onClick={handleHold}>
                {activeCourse?.status === 'on_hold' ? 'Resume' : 'On hold'}
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider', overflowX: 'auto', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Add to
            </Typography>
            <Chip
              label="All seats"
              size="small"
              color={activeSeat === null ? 'primary' : 'default'}
              variant={activeSeat === null ? 'filled' : 'soft'}
              onClick={() => setActiveSeat(null)}
            />
            {Array.from({ length: seatCount }, (_, i) => i + 1).map((n) => (
              <Chip
                key={n}
                label={`Seat ${n}`}
                size="small"
                color={activeSeat === n ? 'primary' : 'default'}
                variant={activeSeat === n ? 'filled' : 'soft'}
                onClick={() => setActiveSeat(n)}
              />
            ))}
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: 0.75, p: 1 }}>
            <Box sx={{ width: 132, minWidth: 132, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {categories.map((c) => (
                <Button
                  key={c}
                  size="small"
                  variant={category === c ? 'contained' : 'soft'}
                  color={category === c ? 'primary' : 'inherit'}
                  onClick={() => setCategory(c)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'capitalize', fontSize: 12, px: 1, minHeight: 34 }}
                >
                  {c === 'all' ? 'All' : c}
                </Button>
              ))}
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                minWidth: 0,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                alignContent: 'start',
                gap: 0.75,
              }}
            >
              {visibleItems.map((item) => (
                <Button
                  key={item.id}
                  variant="soft"
                  color="inherit"
                  onClick={() => addItem(item)}
                  disabled={busy}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    minHeight: 74,
                    p: 1.25,
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

          {/* Main order-flow actions */}
          <Box sx={{ display: 'flex', gap: 1, p: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Button
              variant="contained"
              color="fire"
              disabled={busy || fireDisabled}
              onClick={handleFireCourse}
              startIcon={<LocalFireDepartmentIcon />}
              sx={{ minWidth: 160, fontSize: 15, fontWeight: 700 }}
            >
              {activeCourse?.firedAt ? 'Course sent' : 'Fire course'}
            </Button>
            <Button
              variant="contained"
              color="inherit"
              disabled={busy}
              onClick={handleSplit}
              startIcon={<CallSplitIcon />}
              sx={{ minWidth: 160, fontSize: 15, fontWeight: 700 }}
            >
              Split Check
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={busy}
              onClick={() => setDialog('checkout')}
              sx={{ flexGrow: 1, fontSize: 16, fontWeight: 800 }}
            >
              Pay - {money(subtotal)}
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
              variant="soft"
              disabled={disabled}
              onClick={() => onKey(key === 'back' ? 'back' : key)}
              sx={{ height: 36, minWidth: 0, fontSize: 14, fontWeight: 700, p: 0 }}
            >
              {key === 'back' ? '⌫' : key}
            </Button>
          ))}
        </Box>
      ))}
    </Box>
  )
}

function OrderLine({ line, onSelect, onEdit, selected }) {
  const cancelled = line.kdsStatus === 'cancelled'
  return (
    <ListItem
      dense
      disablePadding
      sx={{
        pl: 2,
        pr: 1,
        py: 0.25,
        bgcolor: selected ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
      }}
      secondaryAction={
        <IconButton size="small" onClick={onEdit} title="Edit item" sx={{ mr: 0.5 }}>
          <EditIcon fontSize="small" />
        </IconButton>
      }
    >
      <ListItemText
        primary={line.itemName}
        secondary={
          <>
            {line.seatNumber ? `Seat ${line.seatNumber} · ` : ''}
            {line.kdsStatus === 'cancelled' ? 'refunded' : line.kdsStatus}
          </>
        }
        primaryTypographyProps={{
          variant: 'body2',
          fontWeight: 600,
          textDecoration: cancelled ? 'line-through' : 'none',
          opacity: cancelled ? 0.6 : 1,
          noWrap: true,
        }}
        secondaryTypographyProps={{ variant: 'caption' }}
        onClick={onSelect}
        sx={{ cursor: 'pointer', mr: 1, minWidth: 0 }}
      />
      <Typography variant="body2" sx={{ fontWeight: 700, opacity: cancelled ? 0.6 : 1, minWidth: 34, textAlign: 'right' }}>
        ×{line.quantity}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, opacity: cancelled ? 0.6 : 1, minWidth: 64, textAlign: 'right' }}>
        {money(line.lineTotal)}
      </Typography>
    </ListItem>
  )
}

function ErrorBanner({ message, onClose }) {
  return (
    <Alert
      severity="error"
      sx={{ fontSize: '0.85rem' }}
      action={
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      {message}
    </Alert>
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
