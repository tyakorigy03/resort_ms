import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RestoreIcon from '@mui/icons-material/Restore'
import { money } from '../format'

// Detail panel for one order line: quantity, seat, course, refund/remove.
export default function ItemDetailDialog({
  open,
  item,
  courses,
  covers,
  onClose,
  onQty,
  onSeat,
  onCourse,
  onRefund,
  onRemove,
  busy,
}) {
  const cancelled = item?.kdsStatus === 'cancelled'
  const fired = Boolean(item?.firedAt)
  const maxSeat = Math.max(Number(covers) || 0, 0)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {item?.itemName}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {cancelled && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }} icon={<RestoreIcon />}>
            Refunded — excluded from the total.
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Quantity
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={busy || cancelled || (item?.quantity || 1) <= 1}
              onClick={() => onQty(item.quantity - 1)}
            >
              −
            </Button>
            <Typography sx={{ fontWeight: 800, minWidth: 28, textAlign: 'center' }}>
              {item?.quantity}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={busy || cancelled || fired}
              onClick={() => onQty(item.quantity + 1)}
            >
              +
            </Button>
          </Box>
        </Box>
        {fired && !cancelled && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Already sent to the kitchen — quantity cannot change; use Refund.
          </Typography>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Seat
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            label="Shared"
            color={!item?.seatNumber ? 'primary' : 'default'}
            variant={!item?.seatNumber ? 'filled' : 'outlined'}
            size="small"
            onClick={() => !busy && onSeat(null)}
          />
          {Array.from({ length: maxSeat }, (_, i) => i + 1).map((n) => (
            <Chip
              key={n}
              label={n}
              color={item?.seatNumber === n ? 'primary' : 'default'}
              variant={item?.seatNumber === n ? 'filled' : 'outlined'}
              size="small"
              onClick={() => !busy && onSeat(n)}
            />
          ))}
          {maxSeat === 0 && (
            <Typography variant="caption" color="text.secondary">
              No covers set on this order yet.
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Course
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {courses.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              color={item?.courseId === c.id ? 'primary' : 'default'}
              variant={item?.courseId === c.id ? 'filled' : 'outlined'}
              size="small"
              onClick={() => !busy && onCourse(c.id)}
            />
          ))}
          <Chip
            label="Before first course"
            color={!item?.courseId ? 'warning' : 'default'}
            variant={!item?.courseId ? 'filled' : 'outlined'}
            size="small"
            onClick={() => !busy && onCourse(null)}
          />
        </Box>

        {fired && !cancelled && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip label="New" color="default" size="small" variant="outlined" />
            <Chip label="Preparing" color="info" size="small" variant="outlined" />
            <Chip label="Ready to collect" color="success" size="small" variant="outlined" />
            <Chip label="Completed" color="success" size="small" variant="outlined" />
          </Box>
        )}

        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Unit price
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {money(item?.unitPrice)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {fired ? (
          <Button
            color="warning"
            variant="outlined"
            disabled={busy || cancelled}
            onClick={() => onRefund(item)}
          >
            {cancelled ? 'Refunded' : 'Refund'}
          </Button>
        ) : (
          <Button
            color="error"
            variant="outlined"
            disabled={busy || cancelled}
            onClick={() => onRemove(item)}
          >
            Remove
          </Button>
        )}
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
