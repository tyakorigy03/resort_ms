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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import HotelIcon from '@mui/icons-material/Hotel'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import { api, getGuestSession } from '../api'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
}

export default function MenuBrowser({ onToggleMode, mode }) {
  const navigate = useNavigate()
  const session = getGuestSession()
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeScreen, setActiveScreen] = useState(null)
  const [cart, setCart] = useState({})
  const [notes, setNotes] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)

  useEffect(() => {
    if (!session?.reservationId || !session?.verified) {
      navigate('/')
      return
    }
    loadMenu()
  }, [])

  async function loadMenu() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.menu(session.reservationId)
      setMenus(data.menus || [])
      if (data.menus?.length) {
        const firstMenu = data.menus[0]
        if (firstMenu.screens?.length) {
          setActiveScreen(firstMenu.screens[0].id)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev[item.itemId] || { ...item, quantity: 0 }
      return { ...prev, [item.itemId]: { ...existing, quantity: existing.quantity + 1 } }
    })
  }

  function removeFromCart(itemId) {
    setCart((prev) => {
      const existing = prev[itemId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } }
    })
  }

  function cartCount() {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)
  }

  function cartTotal() {
    return Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  async function placeOrder() {
    if (!cartCount()) return
    setOrdering(true)
    try {
      const items = Object.values(cart).map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      }))
      const result = await api.createOrder(session.reservationId, items, notes || undefined)
      setOrderSuccess(result)
      setCart({})
      setNotes('')
    } catch (err) {
      setError(err.message || 'Failed to place order')
    } finally {
      setOrdering(false)
    }
  }

  const currentMenu = menus[0]
  const screens = currentMenu?.screens || []
  const currentScreen = screens.find((s) => s.id === activeScreen)
  const screenItems = currentScreen?.items || []

  if (loading) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error && !menus.length) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <IconButton onClick={() => navigate('/dashboard')} size="small" sx={{ mr: 1 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <RestaurantMenuIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, ml: 0.5 }}>
            Order Room Service
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={onToggleMode} size="small" title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto', pb: cartCount() ? 12 : 2 }}>
        {error && (
          <Alert severity="error" sx={{ mx: 2, mt: 2, fontSize: '0.85rem' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!menus.length ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <RestaurantMenuIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No menu available</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please check back later or contact the front desk.
            </Typography>
          </Box>
        ) : (
          <>
            {screens.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                {screens.map((screen) => (
                  <Chip
                    key={screen.id}
                    label={screen.name}
                    color={activeScreen === screen.id ? 'primary' : 'default'}
                    variant={activeScreen === screen.id ? 'filled' : 'outlined'}
                    onClick={() => setActiveScreen(screen.id)}
                    sx={{ flexShrink: 0 }}
                  />
                ))}
              </Box>
            )}

            <Box sx={{ px: 2, pt: 1 }}>
              {screenItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">No items in this category</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {screenItems.map((item) => {
                    const inCart = cart[item.itemId]
                    return (
                      <Card key={item.itemId} variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                {item.name}
                              </Typography>
                              {item.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.3 }}>
                                  {item.description}
                                </Typography>
                              )}
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5 }}>
                                {item.price !== null ? formatMoney(item.price) : 'Price TBD'}
                              </Typography>
                            </Box>

                            {item.price !== null && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, flexShrink: 0 }}>
                                {inCart ? (
                                  <>
                                    <IconButton size="small" onClick={() => removeFromCart(item.itemId)} sx={{ border: 1, borderColor: 'divider' }}>
                                      <RemoveIcon fontSize="small" />
                                    </IconButton>
                                    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                                      {inCart.quantity}
                                    </Typography>
                                    <IconButton size="small" onClick={() => addToCart(item)} sx={{ border: 1, borderColor: 'divider' }}>
                                      <AddIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => addToCart(item)}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                  >
                                    Add
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {cartCount() > 0 && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            p: 2,
            boxShadow: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ShoppingCartIcon color="primary" fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {cartCount()} item{cartCount() === 1 ? '' : 's'}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {formatMoney(cartTotal())}
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Special instructions (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            maxRows={2}
            sx={{ mb: 1.5, '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={ordering || !cartCount()}
            onClick={placeOrder}
            sx={{ py: 1.3, textTransform: 'uppercase', fontWeight: 700 }}
            startIcon={ordering ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
          >
            {ordering ? 'Placing Order…' : `Place Order · ${formatMoney(cartTotal())}`}
          </Button>
        </Box>
      )}

      <Dialog open={!!orderSuccess} onClose={() => { setOrderSuccess(null); navigate('/dashboard') }} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
          <DialogTitle sx={{ pb: 1 }}>Order Placed!</DialogTitle>
          <DialogContentText>
            Your order <strong>{orderSuccess?.orderNumber}</strong> has been sent to the kitchen.
            <br /><br />
            Total: <strong>{formatMoney(orderSuccess?.total)}</strong> has been charged to your room.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant="contained" onClick={() => { setOrderSuccess(null); navigate('/dashboard') }}>
            Back to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
