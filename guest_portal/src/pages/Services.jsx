import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import { api, getGuestSession } from '../api'

export default function Services() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const session = getGuestSession()

  useEffect(() => {
    if (!session?.reservationId || !session?.verified) {
      navigate('/')
      return
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Services
      </Typography>

      <Card
        onClick={() => navigate('/menu')}
        sx={{ cursor: 'pointer', mb: 2, '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.2s' }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RestaurantMenuIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Order Food & Drinks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse menus and order to your room
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
