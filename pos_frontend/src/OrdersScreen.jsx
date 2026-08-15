import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import { money } from './format'
import Receipt from './components/Receipt'

const STATUS_COLORS = {
  open: 'success',
  paid: 'primary',
  void: 'error',
}

export default function OrdersScreen() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('today')
  const [search, setSearch] = useState('')
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

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'open', 'paid', 'void'].map((s) => (
          <Chip
            key={s}
            label={s}
            color={status === s ? 'primary' : 'default'}
            variant={status === s ? 'filled' : 'outlined'}
            onClick={() => setStatus(s)}
            sx={{ textTransform: 'capitalize' }}
          />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        {['today', 'all'].map((d) => (
          <Chip
            key={d}
            label={d === 'today' ? 'Today' : 'All dates'}
            color={date === d ? 'primary' : 'default'}
            variant={date === d ? 'filled' : 'outlined'}
            onClick={() => setDate(d)}
          />
        ))}
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

      <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No orders match.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1 }}>
            {orders.map((o) => (
              <Button
                key={o.id}
                variant="outlined"
                color="inherit"
                onClick={() => {
                  if (o.status === 'open') navigate('/register', { state: { orderId: o.id } })
                  else setReceipt(o)
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  textTransform: 'none',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {o.orderNumber}
                  </Typography>
                  <Chip
                    label={o.status}
                    size="small"
                    color={STATUS_COLORS[o.status] || 'default'}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                  {o.tableLabel ? `Table ${o.tableLabel}` : o.collectionCode ? `Code ${o.collectionCode}` : o.orderType}
                  {o.covers ? ` · ${o.covers} covers` : ''}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                  {fmt(o.createdAt)}
                  {o.staffName ? ` · ${o.staffName}` : ''}
                  {o.customerName ? ` · ${o.customerName}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="caption" color="text.secondary">
                    {o.itemsTotal || ''}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {money(o.total)}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>
        )}
      </Box>

      <Receipt order={receipt} onClose={() => setReceipt(null)} />
    </Box>
  )
}

function fmt(value) {
  if (!value) return ''
  return new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}
