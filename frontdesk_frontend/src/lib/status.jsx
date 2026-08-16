import Chip from '@mui/material/Chip'

export function statusColor(status) {
  switch (status) {
    case 'booked':
      return 'primary'
    case 'checked_in':
      return 'success'
    case 'checked_out':
      return 'default'
    case 'no_show':
      return 'error'
    case 'cancelled':
      return 'default'
    default:
      return 'default'
  }
}

export function StatusChip({ status }) {
  return <Chip label={status.replace('_', ' ')} color={statusColor(status)} size="small" />
}
