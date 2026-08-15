import { Box, Button, Chip, Drawer, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

const STATUS_LABEL = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  on_hold: 'On hold',
  cancelled: 'Refunded',
}

const STATUS_COLOR = {
  new: 'warning',
  preparing: 'primary',
  ready: 'success',
  on_hold: 'default',
}

// Spec 4: "Items list" slide-over — a condensed view of every pending line
// across the visible tickets, grouped per ticket, with an advance action.
export default function ItemsDrawer({ open, onClose, tickets, onAdvance }) {
  const rows = tickets.flatMap((t) =>
    t.items
      .filter((i) => i.kdsStatus !== 'completed' && i.kdsStatus !== 'cancelled')
      .map((i) => ({ ticket: t, item: i })),
  )

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 380 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Items list
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>
        {rows.length} pending {rows.length === 1 ? 'item' : 'items'} to prepare.
      </Typography>

      <Box sx={{ p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing left to prepare. Nice work!
          </Typography>
        )}
        {rows.map(({ ticket, item }) => {
          const next =
            item.kdsStatus === 'on_hold'
              ? 'preparing'
              : item.kdsStatus === 'new'
                ? 'preparing'
                : item.kdsStatus === 'preparing'
                  ? 'ready'
                  : item.kdsStatus === 'ready'
                    ? 'completed'
                    : null
          return (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.quantity}× {item.itemName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ticket.orderNumber}
                  {ticket.courseNumber ? ` · Course ${ticket.courseNumber}` : ''}
                  {item.seatNumber ? ` · Seat ${item.seatNumber}` : ''}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={STATUS_LABEL[item.kdsStatus] || item.kdsStatus}
                color={STATUS_COLOR[item.kdsStatus] || 'default'}
                variant="outlined"
                sx={{ fontSize: 11, height: 20 }}
              />
              {next && (
                <Button
                  size="small"
                  variant="contained"
                  color={next === 'ready' ? 'success' : next === 'completed' ? 'primary' : 'fire'}
                  onClick={() => onAdvance(item, next)}
                  sx={{ whiteSpace: 'nowrap', px: 1.25 }}
                >
                  {next === 'preparing' ? 'Start' : next === 'ready' ? 'Ready' : 'Done'}
                </Button>
              )}
            </Box>
          )
        })}
      </Box>
    </Drawer>
  )
}
