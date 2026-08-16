import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import { api } from '../api'
import { formatMoney } from '../lib/format'
import { statusColors } from '../theme'

const DAYS = 14
const LABEL_W = 216
const DATE_W = 96

// Weekend columns get a pale tint. Change the numbers per locale: 0 = Sunday
// ... 6 = Saturday, e.g. [6, 0] for Sat+Sun or [5, 6] for Fri+Sat.
const WEEKEND_DAYS = [0, 6]

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

const stickyLabelSx = {
  position: 'sticky',
  left: 0,
  zIndex: 3,
  bgcolor: 'background.paper',
}

const weekendBg = (date) => (WEEKEND_DAYS.includes(parseLocal(date).getDay()) ? 'weekend' : 'transparent')

function StatusPill({ label, count, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          bgcolor: color,
          color: '#fff',
          height: 20,
          minWidth: 20,
          fontSize: '0.72rem',
          fontWeight: 700,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Box>
  )
}

function DayHeader({ date }) {
  const d = parseLocal(date)
  return (
    <Box sx={{ textAlign: 'center', lineHeight: 1.15, py: 0.75, bgcolor: weekendBg(date) }}>
      <Box sx={{ fontSize: '0.62rem', fontWeight: 600, color: 'text.secondary' }}>
        {d.toLocaleDateString('en-US', { weekday: 'short' })}
      </Box>
      <Box sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{d.getDate()}</Box>
      <Box sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</Box>
    </Box>
  )
}

function HkIcon({ status }) {
  const color =
    status === 'clean'
      ? statusColors.vacant
      : status === 'dirty'
        ? statusColors.dirty
        : status === 'cleaning'
          ? statusColors.occupied
          : statusColors.neutral
  return (
    <Tooltip title={`Housekeeping: ${status || '—'}`}>
      <CleaningServicesIcon sx={{ fontSize: 13, color }} />
    </Tooltip>
  )
}

function Bar({ left, width, bgcolor, title, onClick, children }) {
  return (
    <Box
      onClick={onClick}
      title={title}
      sx={{
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: `calc(${left}% + 1px)`,
        width: `calc(${width}% - 2px)`,
        borderRadius: '3px',
        bgcolor,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        px: 0.5,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        zIndex: 2,
        '&:hover': { filter: 'brightness(0.94)' },
      }}
    >
      {children}
    </Box>
  )
}

function StayBar({ stay, days, startDate }) {
  const navigate = useNavigate()
  if (!['checked_in', 'booked'].includes(stay.status)) return null
  const startIdx = Math.max(0, diffDays(stay.checkInDate, startDate))
  const endIdx = Math.min(days, diffDays(stay.checkOutDate, startDate))
  if (endIdx <= startIdx) return null
  const color = stay.status === 'checked_in' ? statusColors.checkedIn : statusColors.booked
  return (
    <Bar
      left={(startIdx / days) * 100}
      width={((endIdx - startIdx) / days) * 100}
      bgcolor={color}
      title={`${stay.guestName} · ${stay.status === 'checked_in' ? 'In-house' : 'Booked'} · ${monthDay(stay.checkInDate)} → ${monthDay(stay.checkOutDate)}`}
      onClick={() => navigate(`/reservations/${stay.id}`)}
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
    </Bar>
  )
}

function BlockBar({ block, days, startDate }) {
  const startIdx = Math.max(0, diffDays(block.startDate, startDate))
  const endIdx = Math.min(days, diffDays(block.endDate, startDate) + 1)
  if (endIdx <= startIdx) return null
  return (
    <Bar
      left={(startIdx / days) * 100}
      width={((endIdx - startIdx) / days) * 100}
      bgcolor={statusColors.block}
      title={`${block.reason} · ${monthDay(block.startDate)} → ${monthDay(block.endDate)}`}
    >
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {block.reason}
      </Typography>
    </Bar>
  )
}

export default function StaysBoard() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState(todayStr)
  const [data, setData] = useState(null)
  const [ratePlans, setRatePlans] = useState([])
  const [ratePlanId, setRatePlanId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, rp] = await Promise.all([api.stays({ startDate, days: DAYS }), api.ratePlans()])
      setData(s)
      setRatePlans(rp)
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

  const groups = useMemo(
    () => (data?.roomTypes || []).filter((g) => !typeFilter || g.id === Number(typeFilter)),
    [data, typeFilter],
  )

  const roomsByType = useMemo(() => {
    const map = {}
    for (const r of data?.rooms || []) {
      ;(map[r.roomTypeId] = map[r.roomTypeId] || []).push(r)
    }
    return map
  }, [data])

  const staysByRoom = useMemo(() => {
    const map = {}
    const rpId = ratePlanId ? Number(ratePlanId) : null
    for (const s of data?.stays || []) {
      if (!s.roomId) continue
      if (rpId !== null && s.ratePlanId !== rpId) continue
      ;(map[s.roomId] = map[s.roomId] || []).push(s)
    }
    return map
  }, [data, ratePlanId])

  const blocksByRoom = useMemo(() => {
    const map = {}
    for (const b of data?.blocks || []) {
      ;(map[b.roomId] = map[b.roomId] || []).push(b)
    }
    return map
  }, [data])

  const counts = data?.statusCounts
  const pills = [
    ['All', counts?.all, statusColors.neutral],
    ['Vacant', counts?.vacant, statusColors.vacant],
    ['Occupied', counts?.occupied, statusColors.occupied],
    ['Reserved', counts?.reserved, statusColors.reserved],
    ['Blocked', counts?.blocked, statusColors.blocked],
    ['Due Out', counts?.dueOut, statusColors.dueOut],
    ['Dirty', counts?.dirty, statusColors.dirty],
  ]

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.id))

  const toggleGroup = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.id)))
  }

  const pickDate = () => {
    const el = dateInputRef.current
    if (el?.showPicker) el.showPicker()
    else el?.focus()
  }

  const anchorLabel = parseLocal(startDate).toLocaleDateString('en-GB')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 1 }}>
          Stays
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" variant="outlined" onClick={() => navigate('/reservations/new')}>
          New booking
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Card sx={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" title="Choose date" onClick={pickDate}>
                  <CalendarMonthIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{anchorLabel}</Typography>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={startDate}
                  onChange={(e) => e.target.value && setStartDate(e.target.value)}
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                {pills.map(([label, count, color]) => (
                  <StatusPill key={label} label={label} count={count ?? '—'} color={color} />
                ))}
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <FormControl variant="standard" size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Rate plan</InputLabel>
                <Select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)} label="Rate plan">
                  <MenuItem value="">All rate plans</MenuItem>
                  {ratePlans.map((rp) => (
                    <MenuItem key={rp.id} value={String(rp.id)}>
                      {rp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <IconButton
                  size="small"
                  title={allCollapsed ? 'Expand all' : 'Collapse all'}
                  onClick={toggleAll}
                  disabled={groups.length === 0}
                >
                  {allCollapsed ? <AddIcon sx={{ fontSize: 16 }} /> : <RemoveIcon sx={{ fontSize: 16 }} />}
                </IconButton>
                <FormControl variant="standard" size="small" sx={{ minWidth: 170 }}>
                  <InputLabel>Room Type</InputLabel>
                  <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="Room Type">
                    <MenuItem value="">All room types</MenuItem>
                    {(data?.roomTypes || []).map((rt) => (
                      <MenuItem key={rt.id} value={String(rt.id)}>
                        {rt.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex', gap: 1.25 }}>
                  {[
                    ['checkedIn', 'In-house'],
                    ['booked', 'Booked'],
                    ['block', 'Blocked'],
                  ].map(([k, label]) => (
                    <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 14, height: 8, borderRadius: '2px', bgcolor: statusColors[k] }} />
                      <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary' }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
                <IconButton size="small" title="Previous days" onClick={() => setStartDate(addDays(startDate, -DAYS))}>
                  <ChevronLeftIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton size="small" title="Next days" onClick={() => setStartDate(addDays(startDate, DAYS))}>
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `${LABEL_W}px repeat(${DAYS}, ${DATE_W}px)`,
                    minWidth: LABEL_W + DAYS * DATE_W,
                  }}
                >
                  <Box sx={{ ...stickyLabelSx, ...thSx, color: 'text.secondary' }}>Room</Box>
                  {dates.map((d) => (
                    <Box key={d} sx={{ ...thSx, px: 0.5 }}>
                      <DayHeader date={d} />
                    </Box>
                  ))}

                  {groups.map((g) => {
                    const isCollapsed = collapsed.has(g.id)
                    const rooms = roomsByType[g.id] || []
                    return (
                      <Fragment key={g.id}>
                        <Box
                          sx={{
                            ...stickyLabelSx,
                            ...labelSx,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            py: 0.75,
                          }}
                        >
                          <IconButton size="small" sx={{ p: 0.25 }} onClick={() => toggleGroup(g.id)} title={isCollapsed ? 'Expand' : 'Collapse'}>
                            {isCollapsed ? <AddIcon sx={{ fontSize: 14 }} /> : <RemoveIcon sx={{ fontSize: 14 }} />}
                          </IconButton>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{g.name}</Typography>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>({g.totalRooms})</Typography>
                        </Box>
                        {dates.map((d, i) => (
                          <Box
                            key={d}
                            sx={{
                              ...dataSx,
                              py: 0.75,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.5,
                              bgcolor: weekendBg(d),
                            }}
                          >
                            <Chip
                              label={g.available[i]}
                              size="small"
                              sx={{
                                bgcolor: statusColors.rose,
                                color: '#fff',
                                height: 18,
                                minWidth: 20,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                '& .MuiChip-label': { px: 0.75 },
                              }}
                            />
                            {g.avgRate[i] != null && (
                              <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1 }}>
                                {formatMoney(g.avgRate[i])}
                              </Typography>
                            )}
                          </Box>
                        ))}

                        {!isCollapsed &&
                          rooms.map((room) => (
                            <Fragment key={room.id}>
                              <Box
                                sx={{
                                  ...stickyLabelSx,
                                  ...labelSx,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  opacity: room.isActive ? 1 : 0.45,
                                }}
                              >
                                <Typography sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{room.roomNumber}</Typography>
                                {room.status === 'ooo' && (
                                  <Tooltip title="Out of order">
                                    <ReportProblemIcon sx={{ fontSize: 13, color: statusColors.block }} />
                                  </Tooltip>
                                )}
                                <HkIcon status={room.housekeepingStatus} />
                              </Box>
                              <Box
                                sx={{
                                  gridColumn: '2 / -1',
                                  position: 'relative',
                                  height: 34,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                {(staysByRoom[room.id] || []).map((stay) => (
                                  <StayBar key={`s-${stay.id}`} stay={stay} days={DAYS} startDate={startDate} />
                                ))}
                                {(blocksByRoom[room.id] || []).map((block) => (
                                  <BlockBar key={`b-${block.id}`} block={block} days={DAYS} startDate={startDate} />
                                ))}
                              </Box>
                            </Fragment>
                          ))}
                      </Fragment>
                    )
                  })}

                  <Box sx={{ ...stickyLabelSx, ...labelSx, fontWeight: 600 }}>Room Occupancy %</Box>
                  {dates.map((d, i) => (
                    <Box key={d} sx={{ ...dataSx, color: 'text.secondary', bgcolor: weekendBg(d) }}>
                      {data.occupancy?.[i] ?? '—'}%
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}
