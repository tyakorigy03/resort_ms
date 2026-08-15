import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import { useKds } from './KdsShell'
import TicketCard from './components/TicketCard'

const POLL_MS = 15000

export default function Board() {
  const { settings } = useKds()
  const [tickets, setTickets] = useState([])
  const [orderStatus, setOrderStatus] = useState('all')
  const [orderType, setOrderType] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const lastCount = useRef(0)

  const refresh = useCallback(async () => {
    try {
      const list = await api.tickets()
      if (list.length > lastCount.current && lastCount.current > 0) chime('new')
      lastCount.current = list.length
      setTickets(list)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function onAdvance(item, status) {
    setError(null)
    try {
      const res = await api.updateItemStatus(item.id, status)
      setTickets(res.tickets)
      if (res.orderCompleted) chime('done')
    } catch (err) {
      setError(err.message)
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (orderStatus !== 'all' && t.orderStatus !== orderStatus) return false
      if (orderType !== 'all' && t.orderType !== orderType) return false
      if (
        q &&
        !t.orderNumber.toLowerCase().includes(q) &&
        !(t.tableLabel || '').toLowerCase().includes(q) &&
        !(t.collectionCode || '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [tickets, orderStatus, orderType, search])

  const activeCount = tickets.filter((t) => !t.items.every((i) => i.kdsStatus === 'completed' || i.kdsStatus === 'cancelled')).length

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

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {settings.showOrderStatusFilters && (
          <>
            {['all', 'open', 'paid'].map((s) => (
              <Chip
                key={s}
                label={s === 'all' ? 'All orders' : s}
                color={orderStatus === s ? 'primary' : 'default'}
                variant={orderStatus === s ? 'filled' : 'outlined'}
                onClick={() => setOrderStatus(s)}
                sx={{ textTransform: 'capitalize' }}
              />
            ))}
          </>
        )}
        {settings.showOrderTypeFilters && (
          <>
            {['all', 'dine_in', 'pickup', 'delivery'].map((t) => (
              <Chip
                key={t}
                label={t === 'all' ? 'All types' : t}
                color={orderType === t ? 'primary' : 'default'}
                variant={orderType === t ? 'filled' : 'outlined'}
                onClick={() => setOrderType(t)}
                sx={{ textTransform: 'capitalize' }}
              />
            ))}
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {activeCount} active · {tickets.length} tickets
        </Typography>
        <IconButton size="small" onClick={refresh} title="Refresh">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Search by order number, table or code…"
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
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(Math.max(Number(settings.layouts?.columns) || 3, 1), 6)}, minmax(0, 1fr))`,
          alignContent: 'start',
          gap: 1,
        }}
      >
        {loading ? (
          <Box sx={{ gridColumn: '1 / -1', display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : visible.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              No tickets to show.
            </Typography>
          </Box>
        ) : (
          visible.map((t) => (
            <TicketCard
              key={`${t.orderId}-${t.courseId ?? 'none'}`}
              ticket={t}
              settings={settings}
              now={now}
              onAdvance={onAdvance}
            />
          ))
        )}
      </Box>
    </Box>
  )
}

function chime(kind) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = kind === 'new' ? 880 : 660
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    /* audio unavailable */
  }
}
