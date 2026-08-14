import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import RemoveIcon from '@mui/icons-material/Remove'
import SearchIcon from '@mui/icons-material/Search'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { api, clearSession } from './api'
import ClockInDialog from './components/ClockInDialog'
import SalePeriodDialog from './components/SalePeriodDialog'
import CheckoutDialog from './components/CheckoutDialog'
import Receipt from './components/Receipt'
import { money } from './format'

const MY_SHIFT_KEY = 'pos_my_shift'

function loadMyShift() {
  try {
    return JSON.parse(localStorage.getItem(MY_SHIFT_KEY) || 'null')
  } catch {
    return null
  }
}

export default function Console({ device, onLogout }) {
  const [items, setItems] = useState([])
  const [period, setPeriod] = useState(null)
  const [myShift, setMyShift] = useState(loadMyShift)
  const [cart, setCart] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [clock, setClock] = useState(new Date())
  const [today, setToday] = useState({ count: 0, total: 0 })
  const [dialog, setDialog] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  const [drawerMsg, setDrawerMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.items(), api.salePeriodCurrent(), api.clockActive(), api.ordersToday()])
      .then(([itemList, currentPeriod, , orders]) => {
        setItems(itemList.filter((i) => i.mainPrice !== null && i.mainPrice !== undefined))
        setPeriod(currentPeriod)
        setToday({
          count: orders.length,
          total: orders.reduce((s, o) => s + o.total, 0),
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(MY_SHIFT_KEY, JSON.stringify(myShift))
  }, [myShift])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return ['all', ...set]
  }, [items])

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (category !== 'all' && i.category !== category) return false
      if (q && !i.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, category, search])

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0)

  function addItem(item) {
    setError(null)
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id)
      if (existing) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...prev, { itemId: item.id, name: item.name, unitPrice: item.mainPrice, qty: 1 }]
    })
  }

  function setQty(itemId, qty) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.itemId !== itemId)
        : prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
    )
  }

  async function refresh() {
    try {
      const [currentPeriod, activeShifts, orders] = await Promise.all([
        api.salePeriodCurrent(),
        api.clockActive(),
        api.ordersToday(),
      ])
      setPeriod(currentPeriod)
      setToday({ count: orders.length, total: orders.reduce((s, o) => s + o.total, 0) })
      if (myShift && !activeShifts.some((s) => s.id === myShift.id)) {
        setMyShift(null)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  function logout() {
    clearSession()
    onLogout()
  }

  async function openDrawer() {
    setError(null)
    try {
      const res = await api.drawerOpen()
      setDrawerMsg(res.opened ? 'Cash drawer opened.' : res.reason)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <Box sx={{ height: '100svh', display: 'grid', placeItems: 'center', bgcolor: '#f1f5f9' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column', bgcolor: '#f1f5f9' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 38, height: 38 }}>
              <StorefrontIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2, fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {device?.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.2, display: 'block' }}>
                {device?.outletName || 'Restaurant'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
            label={period ? `Open since ${fmtTime(period.openedAt)}` : 'Sales period closed'}
            color={period ? 'success' : 'error'}
            size="small"
            clickable
            onClick={() => setDialog('period')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<PersonIcon sx={{ fontSize: 16 }} />}
            label={myShift ? `Serving: ${myShift.staffName}` : 'No cashier clocked in'}
            color={myShift ? 'success' : 'default'}
            size="small"
            clickable
            onClick={() => setDialog('staff')}
            sx={{ fontWeight: 600 }}
          />

          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, lineHeight: 1.2 }}>
              Today
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {today.count} orders · {money(today.total)}
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 58, textAlign: 'right' }}>
            {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>

          <IconButton color="inherit" size="small" onClick={logout} title="Lock">
            <LockIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert
          severity="error"
          sx={{ m: 1 }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {drawerMsg && (
        <Alert
          severity="info"
          sx={{ m: 1 }}
          action={
            <IconButton size="small" onClick={() => setDrawerMsg(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {drawerMsg}
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', gap: 1.5, p: 1.5, minHeight: 0 }}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
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
          <Box sx={{ display: 'flex', gap: 1, py: 1, overflowX: 'auto' }}>
            {categories.map((c) => (
              <Chip
                key={c}
                label={c}
                color={category === c ? 'primary' : 'default'}
                variant={category === c ? 'filled' : 'outlined'}
                onClick={() => setCategory(c)}
                size="small"
                sx={{ textTransform: 'capitalize', fontWeight: 600, flexShrink: 0 }}
              />
            ))}
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 1,
              alignContent: 'start',
              minHeight: 0,
              pb: 0.5,
            }}
          >
            {visibleItems.map((item) => (
              <Button
                key={item.id}
                variant="outlined"
                color="inherit"
                onClick={() => addItem(item)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  minHeight: 92,
                  p: 1.5,
                  textTransform: 'none',
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
              <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
                No items match.
              </Typography>
            )}
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ width: 370, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', p: 1.5, pb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Current order
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {cart.length} lines
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, minHeight: 0 }}>
            {cart.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Tap items to add them.
              </Typography>
            )}
            {cart.map((line) => (
              <Box
                key={line.itemId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 1,
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {money(line.unitPrice)} each
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => setQty(line.itemId, line.qty - 1)}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>
                    {line.qty}
                  </Typography>
                  <IconButton size="small" onClick={() => setQty(line.itemId, line.qty + 1)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 70, textAlign: 'right' }}>
                  {money(line.unitPrice * line.qty)}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {money(subtotal)}
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              size="large"
              onClick={openDrawer}
              sx={{ mb: 1, textTransform: 'none' }}
            >
              No sale (open drawer)
            </Button>
            <Button
              fullWidth
              size="large"
              variant="contained"
              color="success"
              disabled={!period || cart.length === 0}
              onClick={() => setDialog('checkout')}
            >
              {period ? 'Charge' : 'Open sales period first'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <ClockInDialog
        open={dialog === 'staff'}
        onClose={() => setDialog(null)}
        onChanged={() => {
          refresh()
          setMyShift(loadMyShift())
        }}
      />
      <SalePeriodDialog
        open={dialog === 'period'}
        onClose={() => setDialog(null)}
        period={period}
        onChanged={refresh}
      />
      <CheckoutDialog
        open={dialog === 'checkout'}
        onClose={() => setDialog(null)}
        cart={cart}
        staffId={myShift?.staffId}
        onPaid={(order) => {
          setCart([])
          setDialog(null)
          setReceipt(order)
          refresh()
        }}
      />
      <Receipt order={receipt} onClose={() => setReceipt(null)} />
    </Box>
  )
}

function fmtTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
