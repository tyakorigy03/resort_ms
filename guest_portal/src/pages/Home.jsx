import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import BedtimeIcon from '@mui/icons-material/Bedtime'
import GroupIcon from '@mui/icons-material/Group'
import DoorFrontIcon from '@mui/icons-material/DoorFront'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import LocalBarIcon from '@mui/icons-material/LocalBar'
import SpaIcon from '@mui/icons-material/Spa'
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService'
import LocalCafeIcon from '@mui/icons-material/LocalCafe'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import RoomServiceIcon from '@mui/icons-material/RoomService'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ExploreIcon from '@mui/icons-material/Explore'
import { api, getGuestSession } from '../api'

const outletIcons = {
  restaurant: <RestaurantIcon />,
  bar: <LocalBarIcon />,
  lounge: <LocalBarIcon />,
  spa: <SpaIcon />,
  laundry: <LocalLaundryServiceIcon />,
  minibar: <LocalCafeIcon />,
  shop: <ShoppingBagIcon />,
  room_service: <RoomServiceIcon />,
  other: <StorefrontIcon />,
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function InfoRow({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: '#fff' }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {value || '—'}
        </Typography>
      </Box>
    </Box>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const session = getGuestSession()

  useEffect(() => {
    if (!session?.reservationId || !session?.verified) {
      navigate('/')
      return
    }
    loadData()
  }, [])

  async function loadData() {
    try {
      const [d, o] = await Promise.all([
        api.dashboard(session.reservationId),
        api.outlets(),
      ])
      setData(d)
      setOutlets(o)
    } catch (err) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  const statusColor = data.status === 'checked_in' ? 'success' : data.status === 'booked' ? 'primary' : 'default'

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Room {data.roomNumber || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.roomType || '—'} {data.ratePlan ? `· ${data.ratePlan}` : ''} {data.floor != null ? `· Floor ${data.floor}` : ''}
              </Typography>
            </Box>
            <Chip
              label={data.status === 'checked_in' ? 'In House' : data.status?.replace('_', ' ')}
              color={statusColor}
              size="small"
            />
          </Box>

          <Divider sx={{ mb: 1 }} />

          <InfoRow icon={<CalendarTodayIcon fontSize="small" />} label="Check-in" value={formatDate(data.checkInDate)} />
          <InfoRow icon={<BedtimeIcon fontSize="small" />} label="Check-out" value={formatDate(data.checkOutDate)} />
          <InfoRow icon={<BedtimeIcon fontSize="small" />} label="Duration" value={`${data.nights} night${data.nights === 1 ? '' : 's'}`} />
          <InfoRow icon={<GroupIcon fontSize="small" />} label="Guests" value={`${data.adults} adult${data.adults === 1 ? '' : 's'}${data.children ? `, ${data.children} child${data.children === 1 ? '' : 's'}` : ''}`} />
        </CardContent>
      </Card>

      {outlets.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Services
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            {outlets.map((outlet) => (
              <Card
                key={outlet.id}
                onClick={() => navigate('/menu')}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.2s' }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 2.5, px: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 44, height: 44 }}>
                    {outletIcons[outlet.type] || outletIcons.other}
                  </Avatar>
                  <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                    {outlet.name}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}
