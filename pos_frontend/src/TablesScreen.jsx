import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import { useShell } from './PosShell'
import { money } from './format'

export default function TablesScreen() {
  const { myShift, refresh } = useShell()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [planId, setPlanId] = useState(null)
  const [tables, setTables] = useState([])
  const [sessions, setSessions] = useState([])
  const [openOrders, setOpenOrders] = useState([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('covers')
  const [busyTable, setBusyTable] = useState(null)
  const [coversFor, setCoversFor] = useState(null)
  const [covers, setCovers] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setError(null)
    try {
      const [planList, active, orders] = await Promise.all([
        api.floorPlans(),
        api.tableSessionsActive(),
        api.posOrders({ status: 'open' }),
      ])
      setPlans(planList)
      setSessions(active)
      setOpenOrders(orders)
      setPlanId((prev) => prev || planList[0]?.id || null)
      if (planList[0]?.id) {
        const tableList = await api.tables(planList[0].id)
        setTables(tableList)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!planId) {
      setTables([])
      return
    }
    setError(null)
    api
      .tables(planId)
      .then(setTables)
      .catch((err) => setError(err.message))
  }, [planId])

  const activePlan = useMemo(() => plans.find((p) => p.id === planId) || null, [plans, planId])
  const sessionByTable = (tableId) => sessions.find((s) => s.tableId === tableId)
  const totalBySession = useMemo(
    () => new Map(openOrders.map((o) => [o.tableSessionId, Number(o.total || 0)])),
    [openOrders],
  )

  const query = search.trim().toLowerCase()
  const visibleTables = tables.filter((t) => !query || t.label.toLowerCase().includes(query))
  const positioned = visibleTables.filter((t) => t.posX !== null && t.posY !== null)
  const unpositioned = visibleTables.filter((t) => t.posX === null || t.posY === null)

  async function seatTable(table, coverCount) {
    setBusyTable(table.id)
    setError(null)
    try {
      const session = await api.tableSessionOpen({
        tableId: table.id,
        covers: coverCount,
        staffId: myShift?.staffId || null,
      })
      let order = null
      try {
        order = await api.createOrder({
          tableSessionId: session.id,
          covers: coverCount,
          staffId: myShift?.staffId || null,
        })
      } catch (err) {
        await api.tableSessionClose(session.id)
        throw err
      }
      refresh()
      setCoversFor(null)
      setCovers('')
      navigate('/register', { state: { sessionId: session.id, orderId: order?.id } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyTable(null)
    }
  }

  function tapTable(table) {
    if (busyTable) return
    const session = sessionByTable(table.id)
    if (session) {
      navigate('/register', { state: { sessionId: session.id, orderId: session.openOrderId } })
      return
    }
    // Spec 3.3: when the floor plan does not prompt for covers, seat with the
    // table's full capacity right away.
    if (activePlan?.promptCoverCount === false) {
      seatTable(table, table.seats)
      return
    }
    setCoversFor(table)
    setCovers('')
  }

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert
          severity="error"
          sx={{ fontSize: '0.85rem', mx: 2, mt: 1.5 }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1 }}>
        <Tabs
          value={planId || plans[0]?.id || ''}
          onChange={(_, v) => setPlanId(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flexGrow: 1, minHeight: 44 }}
        >
          {plans.map((p) => (
            <Tab key={p.id} label={`${p.name} (${p.tableCount})`} value={p.id} sx={{ minHeight: 44 }} />
          ))}
        </Tabs>
        <TextField
          size="small"
          placeholder="Search tables"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220, ml: 2 }}
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
      </Box>

      {plans.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          No floor plans yet. Create one in the backoffice.
        </Typography>
      )}

      <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative', m: 1.5, mt: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        {activePlan?.backgroundImageUrl && (
          <Box
            component="img"
            src={activePlan.backgroundImageUrl}
            alt=""
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }}
          />
        )}
        {positioned.map((table) => {
          const session = sessionByTable(table.id)
          return (
            <Box
              key={table.id}
              sx={{
                position: 'absolute',
                left: `${clampPct(table.posX)}%`,
                top: `${clampPct(table.posY)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TableTile
                table={table}
                session={session}
                view={view}
                total={session ? totalBySession.get(session.id) : undefined}
                disabled={Boolean(busyTable)}
                onClick={() => tapTable(table)}
              />
            </Box>
          )
        })}

        {unpositioned.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 'auto 0 0 0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 1,
              p: 1.5,
            }}
          >
            {unpositioned.map((table) => {
              const session = sessionByTable(table.id)
              return (
                <TableTile
                  key={table.id}
                  table={table}
                  session={session}
                  view={view}
                  total={session ? totalBySession.get(session.id) : undefined}
                  disabled={Boolean(busyTable)}
                  onClick={() => tapTable(table)}
                />
              )
            })}
          </Box>
        )}

        {visibleTables.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            No tables found.
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <ToggleButtonGroup
          fullWidth
          exclusive
          size="small"
          value={view}
          onChange={(_, v) => v && setView(v)}
          sx={{ '& .MuiToggleButtonGroup-grouped': { borderRadius: '4px !important' } }}
        >
          {(['covers', 'total', 'time', 'status']).map((v) => (
            <ToggleButton key={v} value={v} sx={{ textTransform: 'none', fontWeight: 700 }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <CoverDialog
        open={Boolean(coversFor)}
        table={coversFor}
        value={covers}
        busy={Boolean(busyTable)}
        onChange={setCovers}
        onCancel={() => {
          setCoversFor(null)
          setCovers('')
        }}
        onConfirm={() => seatTable(coversFor, Number(covers))}
      />
    </Box>
  )
}

function TableTile({ table, session, view, total, disabled, onClick }) {
  const seated = Boolean(session)
  const covers = session?.covers || 0
  const round = table.shape === 'round' || table.shape === 'circle'

  const modeValue = useMemo(() => {
    if (!seated) {
      if (view === 'status') return 'Available'
      return '—'
    }
    switch (view) {
      case 'total':
        return total === undefined || total === null ? money(0) : money(total)
      case 'time':
        return minsSince(session.openedAt)
      case 'status':
        return 'Seated'
      default:
        return String(covers)
    }
  }, [seated, view, covers, total, session])

  return (
    <Box sx={{ width: 112, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: disabled ? 'default' : 'pointer' }} onClick={onClick}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        {seated && (
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 2,
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: 'success.main',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <PersonIcon sx={{ fontSize: 16 }} />
          </Box>
        )}
        <Box
          sx={{
            bgcolor: seated ? 'success.main' : 'background.paper',
            border: '1px solid',
            borderColor: seated ? 'success.main' : 'divider',
            borderRadius: round ? '50%' : 2,
            width: '100%',
            aspectRatio: round ? '1 / 1' : 'auto',
            py: round ? '25%' : 1,
            px: 0.75,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <SeatDots seats={table.seats} covers={seated ? covers : 0} filledColor={seated ? '#fff' : 'success.main'} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: seated ? '#fff' : 'text.primary', fontSize: round ? 15 : 18 }}>
            {table.label}
          </Typography>
          <SeatDots seats={table.seats} covers={seated ? covers : 0} filledColor={seated ? '#fff' : 'success.main'} />
        </Box>
      </Box>
      <Box
        sx={{
          minWidth: 46,
          px: 1,
          py: 0.25,
          borderRadius: 10,
          bgcolor: seated ? 'primary.main' : 'action.hover',
          color: seated ? '#fff' : 'text.secondary',
          fontSize: 12,
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {modeValue}
      </Box>
    </Box>
  )
}

function SeatDots({ seats, covers, filledColor }) {
  const top = Math.ceil(seats / 2)
  const bottom = seats - top
  const renderRow = (count, offset) =>
    Array.from({ length: count }, (_, i) => (
      <Box
        key={i}
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: offset + i < covers ? filledColor : 'rgba(128,128,128,0.35)',
        }}
      />
    ))
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {renderRow(top, 0)}
      {bottom > 0 && renderRow(bottom, top)}
    </Box>
  )
}

// Spec 3.3: "Cover count" dialog — keypad 7 8 9 / 4 5 6 / 1 2 3 / 00 0 C,
// Cancel in red at the top left, Confirm as a full-width blue button at the
// bottom.
function CoverDialog({ open, table, value, busy, onChange, onCancel, onConfirm }) {
  const max = table?.seats || 20
  const tooMany = Number(value) > max

  function onKey(key) {
    if (key === 'clear') onChange('')
    else onChange((value + key).slice(0, 2))
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, m: 0 }}>
        <Button color="error" size="small" onClick={onCancel} sx={{ textTransform: 'none', fontSize: 14, fontWeight: 600 }}>
          Cancel
        </Button>
        <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Cover count
          </Typography>
        </Box>
        <Box sx={{ width: 60 }} />
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
          How many covers are on this table?
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 0.5, my: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {value || '0'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            / {max}
          </Typography>
        </Box>
        {tooMany && (
          <Typography variant="body2" color="error.main" sx={{ textAlign: 'center', mb: 0.5 }}>
            Too many covers for this table.
          </Typography>
        )}
        <Box sx={{ width: 280, mx: 'auto' }}>
          {[['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['00', '0', 'clear']].map((row, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {row.map((key) => (
                <Button
                  key={key}
                  fullWidth
                  variant="outlined"
                  disabled={busy}
                  onClick={() => onKey(key)}
                  sx={{ height: 52, fontSize: 18, fontWeight: 600 }}
                >
                  {key === 'clear' ? 'C' : key}
                </Button>
              ))}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <Box sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={busy || !value || Number(value) < 1 || tooMany}
          onClick={onConfirm}
          sx={{ py: 1.4, fontSize: 16, fontWeight: 700, textTransform: 'none' }}
        >
          {busy ? 'Seating…' : 'Confirm'}
        </Button>
      </Box>
    </Dialog>
  )
}

function clampPct(value) {
  if (value === null || value === undefined) return 0
  return Math.min(Math.max(Number(value), 0), 100)
}

function minsSince(value) {
  if (!value) return '—'
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  return `${mins}m`
}
