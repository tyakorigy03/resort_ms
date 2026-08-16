import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Typography,
} from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining'
import EditIcon from '@mui/icons-material/Edit'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined'
import PersonIcon from '@mui/icons-material/Person'
import RestaurantIcon from '@mui/icons-material/Restaurant'
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
  const [actionsOpen, setActionsOpen] = useState(false)
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

  async function handleServe() {
    if (!order || !activeCourseId) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api.serveCourse(order.id, activeCourseId)
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
    setBusy(true)
    setError(null)
    try {
      const updated = await api.updateOrder(order.id, { orderType: type })
      setOrder(updated)
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

  if (!order) {
    return (
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1.5 }}>
        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
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
      : order.orderType

  const maxSeat = order.covers || 8
  const seatCount = Math.max(maxSeat, 1)
  const courseFired = Boolean(activeCourse?.firedAt)
  const courseServed = activeCourse?.status === 'completed'
  const courseActionDisabled = !activeCourse || activeCourse.items.length === 0 || (courseFired && courseServed)

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1 }}>
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: 1 }}>
        {/* Left: order card + ticket + keypad + actions */}
        <Paper variant="outlined" sx={{ width: 360, minWidth: 360, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 800, lineHeight: 1.1, textTransform: 'capitalize', minWidth: 0, fontSize: 13 }}>
                {headerTitle}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              {order.covers ? <Chip size="small" label={`${order.covers} covers`} sx={{ height: 22, fontSize: 10.5 }} /> : null}
              <Button variant="text" color="inherit" size="small" onClick={() => setActionsOpen(true)} sx={{ fontSize: 11, minHeight: 24, py: 0 }}>
                Actions
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Button
                size="small"
                color="inherit"
                variant="soft"
                disabled={busy}
                startIcon={<PersonIcon />}
                onClick={() => setDialog('customer')}
                sx={{ flex: 1, textWrap: 'nowrap', fontSize: 11, minHeight: 26, py: 0.25 }}
              >
                Assign customer
              </Button>
              <Button
                size="small"
                variant="soft"
                color={order.orderType === 'dine_in' ? 'primary' : 'inherit'}
                disabled={busy}
                startIcon={<RestaurantIcon />}
                onClick={() => handleOrderType('dine_in')}
                sx={{ flex: 1, textWrap: 'nowrap', fontSize: 11, minHeight: 26, py: 0.25 }}
              >
                Dine-in
              </Button>
            </Box>
          </Box>
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
                const itemsLabel = c.items.length ? `(${c.items.length} items)` : '(no items)'
                return (
                  <Box key={c.id}>
                    <ListItemButton
                      onClick={() => { setActiveCourseId(c.id); clearSelection() }}
                      sx={{
                        py: 0.25,
                        minHeight: 32,
                        bgcolor: isActive ? 'primary.main' : 'transparent',
                        color: isActive ? 'primary.contrastText' : 'text.primary',
                        '&:hover': { bgcolor: isActive ? 'primary.main' : 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        {isActive ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={`${c.name} ${itemsLabel}`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                      />
                      <IconButton
                        size="small"
                        title="Add item to this course"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveCourseId(c.id)
                        }}
                        sx={{ color: isActive ? 'primary.contrastText' : undefined }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                    <Collapse in={isActive} timeout="auto" unmountOnExit>
            <List disablePadding dense sx={{ '& .MuiListItem-root, & .MuiListItemButton-root': { minHeight: 28 } }}>
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

              <ListItemButton onClick={handleAddCourse} disabled={busy} sx={{ py: 0.25, minHeight: 32 }}>
                <ListItemIcon sx={{ minWidth: 20 }}>
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
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" onClick={() => setActionsOpen(true)}>
                  Edit order
                </Button>
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" disabled={busy || !activeCourse} onClick={handleHold}>
                  {activeCourse?.status === 'on_hold' ? 'Resume' : 'On hold'}
                </Button>
                <Button sx={{ flexGrow: 1 }} variant="contained" color="primary" startIcon={<TableRestaurantIcon />} onClick={() => navigate('/tables')}>
                  Switch Table
                </Button>
                <Button sx={{ flexGrow: 1 }} variant="soft" color="inherit" disabled={busy} onClick={() => setDialog('checkout')}>
                  Credit card
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Menu: category rail + seat target + items */}
        <Paper variant="outlined" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
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
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: 6, height: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'transparent', borderRadius: 3 },
                '&:hover::-webkit-scrollbar-thumb': { bgcolor: 'divider' },
                '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'text.secondary' },
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
              color={courseFired ? 'primary' : 'fire'}
              disabled={busy || courseActionDisabled}
              onClick={courseFired ? handleServe : handleFireCourse}
              startIcon={courseFired ? <RestaurantIcon /> : <LocalFireDepartmentIcon />}
              sx={{ minWidth: 160, fontSize: 15, fontWeight: 700 }}
            >
              {courseFired ? (courseServed ? 'Served' : 'Serve') : 'Fire course'}
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

      <Dialog open={actionsOpen} onClose={() => setActionsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Order actions</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pb: 2 }}>
          <Button
            fullWidth
            variant="soft"
            color="inherit"
            disabled={busy || !activeCourse}
            startIcon={<PauseCircleOutlinedIcon />}
            onClick={() => { setActionsOpen(false); handleHold() }}
          >
            {activeCourse?.status === 'on_hold' ? 'Resume order' : 'On hold'}
          </Button>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 0.5 }}>
            Order type
          </Typography>
          {['dine_in', 'pickup', 'delivery'].map((type) => (
            <Button
              key={type}
              fullWidth
              variant="soft"
              color={order.orderType === type ? 'primary' : 'inherit'}
              disabled={busy}
              startIcon={type === 'dine_in' ? <RestaurantIcon /> : type === 'pickup' ? <StorefrontIcon /> : <DeliveryDiningIcon />}
              onClick={() => { setActionsOpen(false); handleOrderType(type) }}
            >
              {type === 'dine_in' ? 'Dine-in' : type === 'pickup' ? 'Pickup' : 'Delivery'}
            </Button>
          ))}
        </DialogContent>
      </Dialog>

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

// Kitchen status icon for a ticket line. The kitchen only knows about a line
// once it has been fired (firedAt set); before that it has no icon.
const iconSx = { fontSize: 14, flexShrink: 0 }
function statusIcon(line) {
  if (!line.firedAt) return null
  switch (line.kdsStatus) {
    case 'completed':
      return <CheckCircleIcon titleAccess="Served" sx={{ ...iconSx, color: 'success.main' }} />
    case 'ready':
      return <RestaurantIcon titleAccess="Ready to serve" sx={{ ...iconSx, color: 'primary.main' }} />
    case 'on_hold':
      return <PauseCircleOutlinedIcon titleAccess="On hold" sx={{ ...iconSx, color: 'text.secondary' }} />
    case 'cancelled':
      return null
    default:
      return <LocalFireDepartmentIcon titleAccess="In the kitchen" sx={{ ...iconSx, color: 'fire.main' }} />
  }
}

function OrderLine({ line, onSelect, onEdit, selected }) {
  const cancelled = line.kdsStatus === 'cancelled'
  const status = statusIcon(line)
  return (
    <ListItem
      dense
      disablePadding
      sx={{
        pl: 2,
        pr: 1,
        py: 0,
        bgcolor: selected ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
      }}
    >
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
              <Box
                component="span"
                sx={{
                  flex: '0 1 auto',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: cancelled ? 'line-through' : 'none',
                  opacity: cancelled ? 0.6 : 1,
                }}
              >
                {line.itemName}
              </Box>
              {status}
            <IconButton
              size="small"
              title="Edit item"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              sx={{ p: 0, minWidth: 0, color: 'text.secondary', flexShrink: 0 }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        }
        onClick={onSelect}
        sx={{ cursor: 'pointer', mr: 1, minWidth: 0, my: 0, py: 0 }}
      />
      <Typography variant="body2" sx={{ fontWeight: 700, opacity: cancelled ? 0.6 : 1, minWidth: 28, textAlign: 'right' }}>
        ×{line.quantity}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, opacity: cancelled ? 0.6 : 1, minWidth: 48, textAlign: 'right' }}>
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
