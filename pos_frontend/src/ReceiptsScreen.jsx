import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { api } from './api'
import { money } from './format'
import Receipt from './components/Receipt'

export default function ReceiptsScreen() {
  const [orders, setOrders] = useState([])
  const [date, setDate] = useState('today')
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .posOrders({ status: 'paid', date: date === 'all' ? undefined : date, limit: 100 })
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [date])

  const total = orders.reduce((s, o) => s + o.total, 0)

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

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {['today', 'all'].map((d) => (
          <Chip
            key={d}
            label={d === 'today' ? 'Today' : 'All dates'}
            color={date === d ? 'primary' : 'default'}
            variant={date === d ? 'filled' : 'outlined'}
            onClick={() => setDate(d)}
          />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {orders.length} receipts
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {money(total)}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No paid orders yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1 }}>
            {orders.map((o) => (
              <Button
                key={o.id}
                variant="outlined"
                color="inherit"
                onClick={() => setReceipt(o)}
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {o.orderNumber}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {money(o.total)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {o.tableLabel ? `Table ${o.tableLabel}` : o.collectionCode ? `Code ${o.collectionCode}` : o.orderType}
                  {o.customerName ? ` · ${o.customerName}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {fmt(o.completedAt || o.createdAt)}
                  {o.paymentMethod ? ` · ${o.paymentMethod}` : ''}
                </Typography>
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
