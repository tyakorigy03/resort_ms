import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import { money } from './format'
import Receipt from './components/Receipt'

const STATUS_COLORS = {
  open: 'success',
  paid: 'primary',
  void: 'error',
}

const TYPE_LABELS = {
  dine_in: 'Dine-in',
  pickup: 'Pickup',
  delivery: 'Delivery',
}

// Spec 3.5: order management screen with Dine-in/Pickup/Delivery tabs (with
// counts), search, a Filters popover, and a table of Order | Floor | User |
// Covers | Created | Last edit | Course | Total | Payment rows with an Open
// action for open orders.
export default function OrdersScreen() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('today')
  const [filterAnchor, setFilterAnchor] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .posOrders({
        status: status === 'all' ? undefined : status,
        date: date === 'all' ? undefined : date,
        search: search || undefined,
      })
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [status, date, search])

  const counts = useMemo(() => {
    const c = { all: orders.length, dine_in: 0, pickup: 0, delivery: 0 }
    for (const o of orders) c[o.orderType] = (c[o.orderType] || 0) + 1
    return c
  }, [orders])

  const visible = useMemo(
    () => orders.filter((o) => tab === 'all' || o.orderType === tab),
    [orders, tab],
  )

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
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

      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          ['all', `All (${counts.all})`],
          ['dine_in', `Dine-in (${counts.dine_in})`],
          ['pickup', `Pickup (${counts.pickup})`],
          ['delivery', `Delivery (${counts.delivery})`],
        ].map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            color={tab === value ? 'primary' : 'default'}
            variant={tab === value ? 'filled' : 'outlined'}
            onClick={() => setTab(value)}
          />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={(e) => setFilterAnchor(e.currentTarget)}
        >
          Filters
        </Button>
        <Popover
          open={Boolean(filterAnchor)}
          anchorEl={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Status</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {['all', 'open', 'paid', 'void'].map((s) => (
                <Chip
                  key={s}
                  size="small"
                  label={s}
                  color={status === s ? 'primary' : 'default'}
                  variant={status === s ? 'filled' : 'outlined'}
                  onClick={() => setStatus(s)}
                  sx={{ textTransform: 'capitalize' }}
                />
              ))}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Date</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                size="small"
                label="Today"
                color={date === 'today' ? 'primary' : 'default'}
                variant={date === 'today' ? 'filled' : 'outlined'}
                onClick={() => setDate('today')}
              />
              <Chip
                size="small"
                label="All dates"
                color={date === 'all' ? 'primary' : 'default'}
                variant={date === 'all' ? 'filled' : 'outlined'}
                onClick={() => setDate('all')}
              />
            </Box>
          </Box>
        </Popover>
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Search by order number, code or table…"
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

      <TableContainer sx={{ flexGrow: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No orders match.
          </Typography>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <Cell>Order</Cell>
                <Cell>Floor</Cell>
                <Cell>User</Cell>
                <Cell>Covers</Cell>
                <Cell>Created</Cell>
                <Cell>Last edit</Cell>
                <Cell>Course</Cell>
                <Cell align="right">Total</Cell>
                <Cell>Payment</Cell>
                <Cell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (o.status === 'open') navigate('/register', { state: { orderId: o.id } })
                    else setReceipt(o)
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.orderNumber}</Typography>
                      <Chip
                        label={o.status}
                        size="small"
                        color={STATUS_COLORS[o.status] || 'default'}
                        sx={{ textTransform: 'capitalize', fontSize: 10, height: 18 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{o.tableLabel ? `Table ${o.tableLabel}` : (o.floorPlanName || '—')}</TableCell>
                  <TableCell>{o.staffName || '—'}</TableCell>
                  <TableCell>{o.covers ?? '—'}</TableCell>
                  <TableCell>{time(o.createdAt)}</TableCell>
                  <TableCell>{time(o.updatedAt)}</TableCell>
                  <TableCell>{o.courseName || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{money(o.total)}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{o.paymentMethod || '—'}</TableCell>
                  <TableCell>
                    {o.status === 'open' ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/register', { state: { orderId: o.id } })
                        }}
                      >
                        Open
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReceipt(o)
                        }}
                      >
                        Receipt
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Receipt order={receipt} onClose={() => setReceipt(null)} />
    </Box>
  )
}

function Cell({ align, children }) {
  return (
    <TableCell align={align} sx={{ fontWeight: 800, color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' }}>
      {children}
    </TableCell>
  )
}

function time(value) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
