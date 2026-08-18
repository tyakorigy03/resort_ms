import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material'
import HotelIcon from '@mui/icons-material/Hotel'
import ComputerIcon from '@mui/icons-material/Computer'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import DevicesIcon from '@mui/icons-material/Devices'
import StayPrimaryPortraitIcon from '@mui/icons-material/StayPrimaryPortrait'

const INSTANCES = [
  {
    label: 'Front Desk',
    icon: <HotelIcon />,
    port: 5176,
    path: '/login',
    color: 'primary',
  },
  {
    label: 'Back Office',
    icon: <ComputerIcon />,
    port: 5175,
    path: '/',
    color: 'primary',
  },
  {
    label: 'Guest Portal',
    icon: <StayPrimaryPortraitIcon />,
    port: 5180,
    path: '/',
    color: 'primary',
    guest: true,
  },
  {
    label: 'POS',
    icon: <RestaurantIcon />,
    port: 5173,
    path: '/',
    color: 'primary',
  },
  {
    label: 'KDS',
    icon: <DevicesIcon />,
    port: 5174,
    path: '/',
    color: 'primary',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  function handleClick(instance) {
    if (instance.guest) {
      const url = `${window.location.protocol}//${window.location.hostname}:${instance.port}${instance.path}?toast=not-available`
      window.location.href = url
      return
    }
    if (instance.port === 5176) {
      navigate(instance.path)
      return
    }
    const url = `${window.location.protocol}//${window.location.hostname}:${instance.port}${instance.path}`
    window.location.href = url
  }

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <HotelIcon color="primary" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Yakin Resort
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select an instance to continue
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {INSTANCES.map((inst) => (
              <Button
                key={inst.label}
                variant="contained"
                size="large"
                color={inst.color}
                startIcon={inst.icon}
                fullWidth
                onClick={() => handleClick(inst)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                {inst.guest ? `Download ${inst.label}` : inst.label}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
