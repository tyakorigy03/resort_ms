import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import logo from '../assets/logo.png'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import BedtimeIcon from '@mui/icons-material/Bedtime'
import GroupIcon from '@mui/icons-material/Group'
import DescriptionIcon from '@mui/icons-material/Description'
import DoorFrontIcon from '@mui/icons-material/DoorFront'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import { api, getGuestSession, clearGuestSession } from '../api'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
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

export default function GuestDashboard({ onToggleMode, mode }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])

  const session = getGuestSession()

  useEffect(() => {
    if (!session?.reservationId || !session?.verified) {
      navigate('/')
      return
    }
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError(null)
    try {
      const [dashboard, ordersData] = await Promise.all([
        api.dashboard(session.reservationId),
        api.orders(session.reservationId).catch(() => ({ orders: [] })),
      ])
      setData(dashboard)
      setOrders(ordersData.orders || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearGuestSession()
    navigate('/')
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button variant="outlined" onClick={handleLogout}>Start Over</Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const statusColor = data.status === 'checked_in' ? 'success' : data.status === 'booked' ? 'primary' : 'default'

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Box component="img" src={logo} alt="Logo" sx={{ width: 38, height: 38, objectFit: 'contain' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, ml: 1 }}>
            Guest Portal
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {data.guestName}
          </Typography>
          <IconButton onClick={onToggleMode} size="small" title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
          <Button
            size="small"
            variant="contained"
            startIcon={<RestaurantMenuIcon />}
            onClick={() => navigate('/menu')}
            sx={{ ml: 1, fontSize: '0.75rem', py: 0.5, px: 1.5 }}
          >
            Order Food
          </Button>
          <IconButton onClick={handleLogout} size="small" title="Sign out">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Room {data.roomNumber || '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.roomType || '—'} {data.ratePlan ? `· ${data.ratePlan}` : ''}
                </Typography>
              </Box>
              <Chip
                label={data.status === 'checked_in' ? 'In House' : data.status?.replace('_', ' ')}
                color={statusColor}
                size="small"
              />
            </Box>

            <Divider sx={{ mb: 1 }} />

            <InfoRow
              icon={<CalendarTodayIcon fontSize="small" />}
              label="Check-in"
              value={formatDate(data.checkInDate)}
            />
            <InfoRow
              icon={<BedtimeIcon fontSize="small" />}
              label="Check-out"
              value={formatDate(data.checkOutDate)}
            />
            <InfoRow
              icon={<BedtimeIcon fontSize="small" />}
              label="Duration"
              value={`${data.nights} night${data.nights === 1 ? '' : 's'}`}
            />
            <InfoRow
              icon={<GroupIcon fontSize="small" />}
              label="Guests"
              value={`${data.adults} adult${data.adults === 1 ? '' : 's'}${data.children ? `, ${data.children} child${data.children === 1 ? '' : 's'}` : ''}`}
            />
          </CardContent>
        </Card>

        {data.folio && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Your Charges
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(data.folio.lines?.reduce((sum, l) => sum + Number(l.amount || 0), 0))}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Balance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: data.folio.balance > 0 ? 'error.main' : 'success.main' }}>
                  {formatMoney(data.folio.balance)}
                </Typography>
              </Box>

              {data.folio.lines?.length > 0 ? (
                <List disablePadding>
                  {data.folio.lines.map((line) => (
                    <ListItem key={line.id} disablePadding sx={{ py: 0.75 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {line.description}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {line.type?.replace('_', ' ')}
                          </Typography>
                        }
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatMoney(line.amount)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No charges yet
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {data.floor != null && (
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DoorFrontIcon color="primary" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                  Floor
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {data.floor}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {orders.length > 0 && (
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ShoppingBagIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Your Orders
                </Typography>
              </Box>

              <List disablePadding>
                {orders.map((order) => (
                  <ListItem key={order.id} disablePadding sx={{ py: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {order.orderNumber}
                          </Typography>
                          <Chip
                            label={order.status}
                            size="small"
                            color={order.status === 'paid' ? 'success' : 'default'}
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          {order.createdAt && ` · ${new Date(order.createdAt).toLocaleString()}`}
                        </Typography>
                      }
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatMoney(order.total)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  )
}
