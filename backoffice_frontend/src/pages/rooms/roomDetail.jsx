import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { getRoom } from '../../api/rooms'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'

const STATUS_COLORS = {
  available: { bgcolor: '#dcfce7', color: '#166534' },
  occupied: { bgcolor: '#fee2e2', color: '#991b1b' },
  reserved: { bgcolor: '#fce7f3', color: '#9d174d' },
  ooo: { bgcolor: '#fef3c7', color: '#92400e' },
}

const HK_COLORS = {
  clean: { bgcolor: '#dcfce7', color: '#166534' },
  dirty: { bgcolor: '#fee2e2', color: '#991b1b' },
  cleaning: { bgcolor: '#fef3c7', color: '#92400e' },
  inspected: { bgcolor: '#e0e7ff', color: '#3730a3' },
}

export default function RoomDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    getRoom(id)
      .then((r) => { if (active) setRoom(r) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/rooms/rooms')} sx={{ mb: 1 }}>
            Back to rooms
          </Button>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    )
  }

  if (!room) return null

  const st = STATUS_COLORS[room.status] || STATUS_COLORS.available
  const hk = HK_COLORS[room.housekeepingStatus] || HK_COLORS.clean

  const row = (label, value) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{value}</Typography>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/rooms/rooms')}>
          Back to rooms
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Room {room.roomNumber}
            </Typography>
            <Chip
              label={room.status}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, ...st }}
            />
            {room.status === 'ooo' && (
              <ReportProblemIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            )}
          </Box>

          <Divider sx={{ mb: 1 }} />

          {row('Room Number', room.roomNumber)}
          {row('Room Type', room.roomTypeName || '—')}
          {row('Floor', room.floor ?? '—')}
          {row('Status', (
            <Chip label={room.status} size="small" sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600, ...st }} />
          ))}
          {row('Housekeeping', (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CleaningServicesIcon sx={{ fontSize: 14, color: hk.color }} />
              <Chip label={room.housekeepingStatus} size="small" sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600, ...hk }} />
            </Box>
          ))}
          {row('Active', room.isActive ? 'Yes' : 'No')}
          {row('Created', room.createdAt ? new Date(room.createdAt).toLocaleDateString() : '—')}
        </CardContent>
      </Card>
    </Box>
  )
}
