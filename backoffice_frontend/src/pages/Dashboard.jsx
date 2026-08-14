import { Avatar, Box, Card, CardContent, Typography } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import PeopleIcon from '@mui/icons-material/People'
import PaymentsIcon from '@mui/icons-material/Payments'
import { useAuth } from '../context/AuthContext'

const stats = [
  { label: 'Total bookings', value: '0', icon: <CalendarMonthIcon /> },
  { label: 'Rooms', value: '0', icon: <MeetingRoomIcon /> },
  { label: 'Guests', value: '0', icon: <PeopleIcon /> },
  { label: 'Revenue', value: '$0', icon: <PaymentsIcon /> },
]

function Dashboard() {
  const { user } = useAuth()

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.name}. Here is an overview of the resort.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar variant="rounded" sx={{ bgcolor: 'primary.main' }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h6">{stat.value}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </>
  )
}

export default Dashboard
