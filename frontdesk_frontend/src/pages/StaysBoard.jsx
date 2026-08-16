import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { alpha, useTheme } from '@mui/material/styles'
import { api } from '../api'
import { formatMoney } from '../lib/format'

const DAYS = 14
const LABEL_W = 216
const DATE_W = 64

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function diffDays(a, b) {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000)
}

function parseLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthDay(dateStr) {
  return parseLocal(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dayCell(dateStr) {
  const d = parseLocal(dateStr)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d.getDate()),
  }
}

function hkColor(status) {
  switch (status) {
    case 'clean':
      return 'success'
    case 'dirty':
      return 'error'
    case 'cleaning':
      return 'info'
    default:
      return 'default'
  }
}

function barColor(status, theme) {
  switch (status) {
    case 'booked':
      return theme.palette.primary.main
    case 'checked_in':
      return theme.palette.success.main
    default:
      return theme.palette.text.secondary
  }
}

const thSx = {
  px: 1,
  py: 0.5,
  fontSize: '0.7rem',
  fontWeight: 600,
  borderBottom: '1px solid',
  borderColor: 'divider',
}

const labelSx = {
  px: 1,
  py: 0.5,
  fontSize: '0.72rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderBottom: '1px solid',
  borderColor: 'divider',
}

const dataSx = {
  px: 1,
  py: 0.5,
  fontSize: '0.72rem',
  fontWeight: 700,
  textAlign: 'center',
  borderBottom: '1px solid',
  borderColor: 'divider',
}

function DayHeader({ date }) {
  const { weekday, day } = dayCell(date)
  return (
    <Box sx={{ textAlign: 'center', lineHeight: 1.2 }}>
      <Box sx={{ fontSize: '0.62rem', fontWeight: 600, color: 'text.secondary' }}>{weekday}</Box>
      <Box sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{day}</Box>
    </Box>
  )
}

function StatChip({ label, value, color }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      sx={{ fontSize: '0.72rem', fontWeight: 600 }}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${color}.main` }} />
          <span>{label}:</span>
          <b>{value}</b>
        </Box>
      }
    />
  )
}

function StayBar({ stay, days, startDate }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const startIdx = Math.max(0, diffDays(stay.checkInDate, startDate))
  const endIdx = Math.min(days, diffDays(stay.checkOutDate, startDate))
  if (endIdx <= startIdx) return null
  const left = (startIdx / days) * 100
  const width = ((endIdx - startIdx) / days) * 100
  return (
    <Box
      onClick={() => navigate(`/reservations/${stay.id}`)}
      title={`${stay.guestName} · ${monthDay(stay.checkInDate)} → ${monthDay(stay.checkOutDate)}`}
      sx={{
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: `calc(${left}% + 1px)`,
        width: `calc(${width}% - 2px)`,
        borderRadius: 1,
        bgcolor: barColor(stay.status, theme),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        px: 0.5,
        cursor: 'pointer',
        overflow: 'hidden',
        zIndex: 2,
        '&:hover': { filter: 'brightness(0.94)' },
      }}
    >
      <Typography
        sx={{
          fontSize: '0.64rem',
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {stay.guestName}
      </Typography>
    </Box>
  )
}

export default function StaysBoard() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [startDate, setStartDate] = useState(todayStr)
  const [grid, setGrid] = useState(null)
  const [staysData, setStaysData] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api
      .dashboard()
      .then((d) => {
        if (mounted) setStats(d)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [g, s] = await Promise.all([
        api.availabilityGrid({ startDate, days: DAYS }),
        api.stays({ startDate, days: DAYS }),
      ])
      setGrid(g)
      setStaysData(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [startDate])

  useEffect(() => {
    load()
  }, [load])

  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)), [startDate])
  const todayIndex = diffDays(todayStr(), startDate)
  const todayBg = alpha(theme.palette.primary.main, 0.07)
  const showTodayColumn = todayIndex >= 0 && todayIndex < DAYS

  const staysByRoom = useMemo(() => {
    const map = {}
    for (const s of staysData?.stays || []) {
      if (!s.roomId) continue
      ;(map[s.roomId] = map[s.roomId] || []).push(s)
    }
    return map
  }, [staysData])

  const unassigned = useMemo(() => (staysData?.stays || []).filter((s) => !s.roomId), [staysData])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 1 }}>
          Stays
        </Typography>
        <IconButton size="small" title="Previous days" onClick={() => setStartDate(addDays(startDate, -DAYS))}>
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton size="small" title="Next days" onClick={() => setStartDate(addDays(startDate, DAYS))}>
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Button size="small" variant="outlined" onClick={() => setStartDate(todayStr())}>
          Today
        </Button>
        <Chip label={`${monthDay(startDate)} – ${monthDay(addDays(startDate, DAYS - 1))}`} size="small" variant="outlined" />
        <Box sx={{ flexGrow: 1 }} />
        <StatChip label="Arrivals today" value={stats?.arrivalsToday ?? '—'} color="primary" />
        <StatChip label="Departures today" value={stats?.departuresToday ?? '—'} color="warning" />
        <StatChip label="In-house" value={stats?.inHouse ?? '—'} color="success" />
        <StatChip label="Open folio" value={stats ? formatMoney(stats.openFolioBalance) : '—'} color="fire" />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/reservations/new')}
        >
          New reservation
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading && !grid && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {grid && staysData && (
        <>
          <Card>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                Availability
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `${LABEL_W}px repeat(${DAYS}, ${DATE_W}px)`,
                    minWidth: LABEL_W + DAYS * DATE_W,
                  }}
                >
                  <Box sx={{ ...thSx, color: 'text.secondary' }}>Room type</Box>
                  {dates.map((d, i) => (
                    <Box
                      key={d}
                      sx={{
                        ...thSx,
                        bgcolor: i === todayIndex ? todayBg : 'transparent',
                        color: i === todayIndex ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      <DayHeader date={d} />
                    </Box>
                  ))}
                  {grid.roomTypes.map((rt) => (
                    <Fragment key={rt.id}>
                      <Box sx={{ ...labelSx }}>
                        {rt.name}
                        <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>
                          {' '}({rt.totalRooms})
                        </Typography>
                      </Box>
                      {rt.available.map((n, i) => (
                        <Box
                          key={`${rt.id}-${i}`}
                          sx={{
                            ...dataSx,
                            bgcolor: i === todayIndex ? todayBg : 'transparent',
                            color: n === 0 ? 'error.main' : n <= 2 ? 'warning.main' : 'success.main',
                          }}
                        >
                          {n}
                        </Box>
                      ))}
                    </Fragment>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Stays
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {[
                    ['booked', 'Booked'],
                    ['checked_in', 'In-house'],
                    ['checked_out', 'Checked out'],
                  ].map(([st, label]) => (
                    <Box key={st} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 14, height: 8, borderRadius: '2px', bgcolor: barColor(st, theme) }} />
                      <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary' }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `${LABEL_W}px repeat(${DAYS}, ${DATE_W}px)`,
                    minWidth: LABEL_W + DAYS * DATE_W,
                  }}
                >
                  <Box
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      bgcolor: 'background.paper',
                      ...thSx,
                      color: 'text.secondary',
                    }}
                  >
                    Room
                  </Box>
                  {dates.map((d, i) => (
                    <Box
                      key={d}
                      sx={{
                        ...thSx,
                        px: 0.5,
                        bgcolor: i === todayIndex ? todayBg : 'transparent',
                        color: i === todayIndex ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      <DayHeader date={d} />
                    </Box>
                  ))}

                  {staysData.rooms.map((room) => {
                    const bars = staysByRoom[room.id] || []
                    return (
                      <Fragment key={room.id}>
                        <Box
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            bgcolor: 'background.paper',
                            ...labelSx,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            opacity: room.isActive ? 1 : 0.45,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{room.roomNumber}</Typography>
                          <Chip
                            label={room.housekeepingStatus}
                            size="small"
                            color={hkColor(room.housekeepingStatus)}
                            sx={{ height: 15, fontSize: '0.55rem' }}
                          />
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>
                            {room.roomTypeName}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            position: 'relative',
                            height: 34,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {showTodayColumn && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${(todayIndex / DAYS) * 100}%`,
                                width: 2,
                                bgcolor: 'warning.main',
                                opacity: 0.55,
                                zIndex: 1,
                              }}
                            />
                          )}
                          {bars.map((stay) => (
                            <StayBar key={stay.id} stay={stay} days={DAYS} startDate={startDate} />
                          ))}
                        </Box>
                      </Fragment>
                    )
                  })}

                  <Fragment>
                    <Box
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        bgcolor: 'background.paper',
                        ...labelSx,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Unassigned</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>
                        {unassigned.length} booking{unassigned.length === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        position: 'relative',
                        height: 34,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: todayBg,
                      }}
                    >
                      {showTodayColumn && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${(todayIndex / DAYS) * 100}%`,
                            width: 2,
                            bgcolor: 'warning.main',
                            opacity: 0.55,
                            zIndex: 1,
                          }}
                        />
                      )}
                      {unassigned.map((stay) => (
                        <StayBar key={stay.id} stay={stay} days={DAYS} startDate={startDate} />
                      ))}
                    </Box>
                  </Fragment>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}
