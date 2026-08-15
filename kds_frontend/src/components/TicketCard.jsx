import { Box, Button, Chip, Paper, Typography } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import GroupsIcon from '@mui/icons-material/Groups'

const NEXT_STATUS = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  on_hold: 'preparing',
}

const STATUS_LABEL = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  on_hold: 'On hold',
  cancelled: 'Refunded',
}

export default function TicketCard({ ticket, settings, now, onAdvance }) {
  const elapsed = elapsedSince(ticket.items[0]?.firedAt || ticket.courseFiredAt, now)
  const completed = ticket.items.every((i) => i.kdsStatus === 'completed' || i.kdsStatus === 'cancelled')
  const compact = settings?.ticketView === 'condensed'

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        borderLeft: 4,
        borderLeftColor: completed ? 'success.main' : ticket.orderStatus === 'paid' ? 'primary.main' : 'fire.main',
        opacity: completed ? 0.75 : 1,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {ticket.orderNumber}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {ticket.tableLabel && <Chip size="small" label={`Table ${ticket.tableLabel}`} variant="outlined" />}
            {!ticket.tableLabel && ticket.collectionCode && (
              <Chip size="small" label={`Code ${ticket.collectionCode}`} variant="outlined" />
            )}
            {settings?.showOrderTypeFilters && (
              <Chip size="small" label={ticket.orderType} variant="outlined" sx={{ textTransform: 'capitalize' }} />
            )}
            {settings?.showOrderStatusFilters && (
              <Chip
                size="small"
                label={ticket.orderStatus}
                color={ticket.orderStatus === 'paid' ? 'primary' : 'success'}
                sx={{ textTransform: 'capitalize' }}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' }}>
            <AccessTimeIcon sx={{ fontSize: 16 }} />
            {elapsed}
          </Typography>
          {ticket.covers && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
              <GroupsIcon sx={{ fontSize: 14 }} />
              {ticket.covers}
            </Typography>
          )}
          {ticket.staffName && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {ticket.staffName}
            </Typography>
          )}
        </Box>
      </Box>

      {settings?.showStationFilters && (
        <Typography variant="caption" color="text.secondary">
          {ticket.floorPlanName || 'Kitchen'}
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {ticket.courseName}
        {ticket.courseNumber ? ` · Course ${ticket.courseNumber}` : ''}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {ticket.items.map((item) => (
          <TicketLine key={item.id} item={item} compact={compact} onAdvance={onAdvance} />
        ))}
      </Box>
    </Paper>
  )
}

function TicketLine({ item, compact, onAdvance }) {
  const cancelled = item.kdsStatus === 'cancelled'
  const done = item.kdsStatus === 'completed' || cancelled
  const next = NEXT_STATUS[item.kdsStatus]
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.75,
        borderRadius: 1,
        bgcolor: 'action.hover',
        opacity: done ? 0.65 : 1,
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, textDecoration: cancelled ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {item.quantity}× {item.itemName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.seatNumber ? `Seat ${item.seatNumber} · ` : ''}
          {STATUS_LABEL[item.kdsStatus] || item.kdsStatus}
        </Typography>
      </Box>
      {next && !compact && (
        <Button
          size="small"
          variant="contained"
          color={next === 'ready' ? 'success' : next === 'completed' ? 'primary' : 'fire'}
          disabled={done}
          onClick={() => onAdvance(item, next)}
          sx={{ whiteSpace: 'nowrap', px: 1.5 }}
        >
          {next === 'preparing' ? 'Start' : next === 'ready' ? 'Ready' : 'Done'}
        </Button>
      )}
    </Box>
  )
}

function elapsedSince(value, now) {
  if (!value) return '—'
  const ms = Math.max(now - new Date(value).getTime(), 0)
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s % 60}s`
}
