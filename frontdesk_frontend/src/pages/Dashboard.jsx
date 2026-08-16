import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import EventNoteIcon from '@mui/icons-material/EventNote'
import HotelIcon from '@mui/icons-material/Hotel'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import PaymentsIcon from '@mui/icons-material/Payments'
import WifiTetheringIcon from '@mui/icons-material/WifiTethering'
import { api } from '../api'
import { formatDate, formatMoney } from '../lib/format'

function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}.main`,
            color: '#fff',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [d, a, dp] = await Promise.all([
          api.dashboard(),
          api.reservations({ checkInDate: new Date().toISOString().slice(0, 10), status: 'booked' }),
          api.reservations({ checkOutDate: new Date().toISOString().slice(0, 10), status: 'checked_in' }),
        ])
        if (!mounted) return
        setStats(d)
        setArrivals(a)
        setDepartures(dp)
      } catch (err) {
        if (mounted) setError(err.message)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        {error}
      </Typography>
    )
  }
  if (!stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  const inHouse = stats.inHouse

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Front Desk Dashboard
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<EventNoteIcon />}
          onClick={() => navigate('/reservations/new')}
        >
          New reservation
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<WifiTetheringIcon />} label="Arrivals today" value={stats.arrivalsToday} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ArrowForwardIcon />} label="Departures today" value={stats.departuresToday} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<HotelIcon />} label="In-house" value={inHouse} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<MeetingRoomIcon />} label="Rooms occupied" value={stats.rooms.occupied} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PaymentsIcon />} label="Open folio balance" value={formatMoney(stats.openFolioBalance)} color="fire" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<MeetingRoomIcon />} label="Dirty rooms" value={stats.rooms.dirty} color="warning" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Arrivals today ({arrivals.length})
              </Typography>
              <List dense disablePadding>
                {arrivals.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No arrivals today
                  </Typography>
                )}
                {arrivals.map((r) => (
                  <ListItem key={r.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/reservations/${r.id}`)}>
                      <ListItemText
                        primary={`${r.guestName} — ${r.roomTypeName || 'Room'}${r.roomNumber ? ` (Room ${r.roomNumber})` : ''}`}
                        secondary={`${formatDate(r.checkInDate)} → ${formatDate(r.checkOutDate)} · ${r.nights} night${r.nights === 1 ? '' : 's'}`}
                      />
                      <Button size="small" variant="outlined" color="primary">
                        Check in
                      </Button>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Departures today ({departures.length})
              </Typography>
              <List dense disablePadding>
                {departures.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No departures today
                  </Typography>
                )}
                {departures.map((r) => (
                  <ListItem key={r.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/reservations/${r.id}`)}>
                      <ListItemText
                        primary={`${r.guestName} — ${r.roomTypeName || 'Room'}${r.roomNumber ? ` (Room ${r.roomNumber})` : ''}`}
                        secondary={`${formatDate(r.checkInDate)} → ${formatDate(r.checkOutDate)} · ${r.nights} night${r.nights === 1 ? '' : 's'}`}
                      />
                      <Button size="small" variant="outlined" color="warning">
                        Check out
                      </Button>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
