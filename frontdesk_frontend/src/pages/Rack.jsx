import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material'
import { api } from '../api'

function hkColor(status) {
  switch (status) {
    case 'clean':
      return 'success'
    case 'dirty':
      return 'error'
    case 'cleaning':
      return 'info'
    default:
      return 'warning'
  }
}

function RoomCard({ room, reservation, onClick }) {
  const occupied = Boolean(reservation)
  return (
    <Card sx={{ opacity: room.isActive ? 1 : 0.45 }}>
      <CardActionArea onClick={() => onClick()}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {room.roomNumber}
            </Typography>
            <Chip
              label={occupied ? 'IN' : room.status}
              color={occupied ? 'primary' : 'default'}
              size="small"
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {room.roomTypeName}
          </Typography>
          {occupied ? (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
              {reservation.guestName}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          )}
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
            <Chip label={`HK: ${room.housekeepingStatus || 'unknown'}`} color={hkColor(room.housekeepingStatus)} size="small" variant="outlined" />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default function Rack() {
  const [rooms, setRooms] = useState(null)
  const [reservations, setReservations] = useState([])
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [rs, rv] = await Promise.all([
          api.rooms(),
          api.reservations({ status: 'checked_in' }),
        ])
        if (!mounted) return
        setRooms(rs)
        setReservations(rv)
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
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }
  if (!rooms) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  const byRoom = {}
  for (const r of reservations) {
    if (r.roomId) byRoom[r.roomId] = r
  }
  const active = rooms.filter((r) => r.isActive)
  const floors = [...new Set(active.map((r) => r.floor).filter((f) => f !== null && f !== undefined))].sort()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Room Rack
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip label={`${active.length} rooms`} size="small" variant="outlined" />
        <Chip label={`${reservations.length} in-house`} color="primary" size="small" />
      </Box>

      {floors.length === 0 ? (
        <Grid container spacing={2}>
          {active.map((room) => (
            <Grid item key={room.id} xs={6} sm={4} md={3} lg={2}>
              <RoomCard
                room={room}
                reservation={byRoom[room.id]}
                onClick={() => {
                  const r = byRoom[room.id]
                  if (r) navigate(`/reservations/${r.id}`)
                }}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        floors.map((floor) => (
          <Box key={floor}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Floor {floor}
            </Typography>
            <Grid container spacing={2}>
              {active
                .filter((room) => room.floor === floor)
                .map((room) => (
                  <Grid item key={room.id} xs={6} sm={4} md={3} lg={2}>
                    <RoomCard
                      room={room}
                      reservation={byRoom[room.id]}
                      onClick={() => {
                        const r = byRoom[room.id]
                        if (r) navigate(`/reservations/${r.id}`)
                      }}
                    />
                  </Grid>
                ))}
            </Grid>
          </Box>
        ))
      )}
    </Box>
  )
}
