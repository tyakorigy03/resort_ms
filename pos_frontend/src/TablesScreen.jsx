import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'
import { useShell } from './PosShell'
import KeyPad from './components/KeyPad'

export default function TablesScreen() {
  const { device, myShift, refresh } = useShell()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [planId, setPlanId] = useState(null)
  const [tables, setTables] = useState([])
  const [sessions, setSessions] = useState([])
  const [search, setSearch] = useState('')
  const [busyTable, setBusyTable] = useState(null)
  const [coversFor, setCoversFor] = useState(null)
  const [covers, setCovers] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setError(null)
    try {
      const [planList, active] = await Promise.all([api.floorPlans(), api.tableSessionsActive()])
      setPlans(planList)
      setSessions(active)
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

  const sessionByTable = (tableId) => sessions.find((s) => s.tableId === tableId)
  const query = search.trim().toLowerCase()
  const visibleTables = tables.filter((t) => !query || t.label.toLowerCase().includes(query))

  async function onConfirmCovers() {
    if (!coversFor || !covers) return
    const tableId = coversFor.id
    setBusyTable(tableId)
    setError(null)
    try {
      const session = await api.tableSessionOpen({
        tableId,
        covers: Number(covers),
        staffId: myShift?.staffId || null,
      })
      let order = null
      try {
        order = await api.createOrder({
          tableSessionId: session.id,
          covers: Number(covers),
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

  function openSeated(session) {
    navigate('/register', { state: { sessionId: session.id, orderId: session.openOrderId } })
  }

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

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

      <TextField
        size="small"
        fullWidth
        placeholder="Search for a table"
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

      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
        {plans.map((p) => (
          <Chip
            key={p.id}
            label={`${p.name} (${p.tableCount})`}
            color={planId === p.id ? 'primary' : 'default'}
            variant={planId === p.id ? 'filled' : 'outlined'}
            onClick={() => setPlanId(p.id)}
          />
        ))}
        {plans.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No floor plans yet. Create one in the backoffice.
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          alignContent: 'start',
          gap: 1,
        }}
      >
        {visibleTables.map((table) => {
          const session = sessionByTable(table.id)
          const seated = Boolean(session)
          return (
            <Button
              key={table.id}
              variant={seated ? 'contained' : 'outlined'}
              color={seated ? 'primary' : 'inherit'}
              disabled={Boolean(busyTable)}
              onClick={() => (seated ? openSeated(session) : setCoversFor(table))}
              sx={{
                minHeight: 104,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {table.label}
              </Typography>
              {seated ? (
                <>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {session.covers ? `${session.covers} covers` : 'Occupied'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {fmtTime(session.openedAt)}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {table.seats} seats
                </Typography>
              )}
            </Button>
          )
        })}
        {visibleTables.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No tables found.
          </Typography>
        )}
      </Box>

      <CoversDialog
        open={Boolean(coversFor)}
        table={coversFor}
        value={covers}
        busy={Boolean(busyTable)}
        onChange={setCovers}
        onCancel={() => {
          setCoversFor(null)
          setCovers('')
        }}
        onConfirm={onConfirmCovers}
      />
    </Box>
  )
}

function CoversDialog({ open, table, value, busy, onChange, onCancel, onConfirm }) {
  const max = table?.seats || 20
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Seat {table?.label}
        <IconButton onClick={onCancel} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
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
        <KeyPad
          compact
          onKey={(k) => {
            if (k === 'back') onChange(value.slice(0, -1))
            else onChange((value + k).slice(0, 2))
          }}
        />
        {Number(value) > max && (
          <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
            Too many covers for this table.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={busy || !value || Number(value) < 1 || Number(value) > max}
          onClick={onConfirm}
        >
          {busy ? 'Seating…' : 'Seat table'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function fmtTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
