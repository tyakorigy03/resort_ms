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
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import { useKds } from './KdsShell'
import TicketCard from './components/TicketCard'
import ItemsDrawer from './components/ItemsDrawer'

const POLL_MS = 3000

// Spec 4: the board filters are presented as three bordered groups — an "All"
// pill, the working statuses (New | Preparing | Ready to collect | On hold),
// and a Completed pill — plus an Applied filters row and an Items list
// slide-over.
const STATUS_LABEL = {
  all: 'All',
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready to collect',
  on_hold: 'On hold',
  completed: 'Completed',
}

const TYPE_LABEL = {
  all: 'All types',
  dine_in: 'Dine-in',
  pickup: 'Pickup',
  delivery: 'Delivery',
}

export default function Board() {
  const { settings } = useKds()
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('all')
  const [orderType, setOrderType] = useState('all')
  const [station, setStation] = useState('all')
  const [search, setSearch] = useState('')
  const [itemsOpen, setItemsOpen] = useState(false)
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

  async function onAdvance(item, next) {
    setError(null)
    try {
      const res = await api.updateItemStatus(item.id, next)
      setTickets(res.tickets)
      if (res.orderCompleted) chime('done')
    } catch (err) {
      setError(err.message)
    }
  }

  const stations = useMemo(
    () => [...new Set(tickets.map((t) => t.floorPlanName).filter(Boolean))],
    [tickets],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (status !== 'all' && !t.items.some((i) => i.kdsStatus === status)) return false
      if (orderType !== 'all' && t.orderType !== orderType) return false
      if (station !== 'all' && (t.floorPlanName || 'Kitchen') !== station) return false
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
  }, [tickets, status, orderType, station, search])

  const activeCount = tickets.filter((t) => !t.items.every((i) => i.kdsStatus === 'completed' || i.kdsStatus === 'cancelled')).length

  const applied = [
    status !== 'all' && { key: 'status', label: `Status: ${STATUS_LABEL[status]}`, clear: () => setStatus('all') },
    orderType !== 'all' && { key: 'type', label: `Type: ${TYPE_LABEL[orderType]}`, clear: () => setOrderType('all') },
    station !== 'all' && { key: 'station', label: `Station: ${station}`, clear: () => setStation('all') },
    search.trim() !== '' && { key: 'search', label: `Search: ${search.trim()}`, clear: () => setSearch('') },
  ].filter(Boolean)

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

      {settings?.showOrderStatusFilters && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FilterGroup label="All">
            <Chip
              label="All"
              color={status === 'all' ? 'primary' : 'default'}
              variant={status === 'all' ? 'filled' : 'outlined'}
              onClick={() => setStatus('all')}
            />
          </FilterGroup>
          <FilterGroup label="Working">
            {['new', 'preparing', 'ready', 'on_hold'].map((s) => (
              <Chip
                key={s}
                label={STATUS_LABEL[s]}
                color={status === s ? 'primary' : 'default'}
                variant={status === s ? 'filled' : 'outlined'}
                onClick={() => setStatus(s)}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Done">
            <Chip
              label="Completed"
              color={status === 'completed' ? 'primary' : 'default'}
              variant={status === 'completed' ? 'filled' : 'outlined'}
              onClick={() => setStatus('completed')}
            />
          </FilterGroup>
        </Box>
      )}

      {(settings?.showOrderTypeFilters || settings?.showStationFilters) && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {settings?.showOrderTypeFilters && (
            <FilterGroup label="Type">
              {['all', 'dine_in', 'pickup', 'delivery'].map((t) => (
                <Chip
                  key={t}
                  label={TYPE_LABEL[t]}
                  color={orderType === t ? 'primary' : 'default'}
                  variant={orderType === t ? 'filled' : 'outlined'}
                  onClick={() => setOrderType(t)}
                />
              ))}
            </FilterGroup>
          )}
          {settings?.showStationFilters && stations.length > 0 && (
            <FilterGroup label="Station">
              <Chip
                label="All"
                color={station === 'all' ? 'primary' : 'default'}
                variant={station === 'all' ? 'filled' : 'outlined'}
                onClick={() => setStation('all')}
              />
              {stations.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  color={station === s ? 'primary' : 'default'}
                  variant={station === s ? 'filled' : 'outlined'}
                  onClick={() => setStation(s)}
                />
              ))}
            </FilterGroup>
          )}
        </Box>
      )}

      {applied.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Applied filters
          </Typography>
          {applied.map((f) => (
            <Chip key={f.key} size="small" label={f.label} onDelete={f.clear} sx={{ fontSize: 12 }} />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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
          sx={{ maxWidth: 420 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {activeCount} active · {tickets.length} tickets
        </Typography>
        <ButtonLike onClick={() => setItemsOpen(true)} icon={<FormatListBulletedIcon fontSize="small" />}>
          Items list
        </ButtonLike>
        <IconButton size="small" onClick={refresh} title="Refresh">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(Math.max(Number(settings?.layouts?.columns) || 3, 1), 6)}, minmax(0, 1fr))`,
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

      <Legend />

      <ItemsDrawer
        open={itemsOpen}
        onClose={() => setItemsOpen(false)}
        tickets={visible}
        onAdvance={onAdvance}
      />
    </Box>
  )
}

function FilterGroup({ label, children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 0.5,
        pr: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, px: 0.5, minWidth: 0, whiteSpace: 'nowrap' }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

function ButtonLike({ children, onClick, icon }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        color: 'text.secondary',
        px: 1,
        py: 0.5,
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {icon}
      {children}
    </Box>
  )
}

function Legend() {
  const rows = [
    ['New', 'fire.main'],
    ['Preparing', 'warning.main'],
    ['Ready to collect', 'success.main'],
    ['On hold', 'text.disabled'],
    ['Completed', 'primary.main'],
  ]
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', px: 0.5, pb: 0.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Legend
      </Typography>
      {rows.map(([label, color]) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      ))}
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
