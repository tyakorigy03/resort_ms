import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PinIcon from '@mui/icons-material/Pin'
import LoginIcon from '@mui/icons-material/Login'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { useAuth } from '../../context/AuthContext'

function Login() {
  const { user, login, loginWithPin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({ email: '', password: '' })
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (tab === 0) {
        if (!form.email || !form.password) {
          setError('Please enter your email and password')
          setSubmitting(false)
          return
        }
        await login(form.email, form.password)
      } else {
        if (!pin) {
          setError('Please enter your PIN')
          setSubmitting(false)
          return
        }
        await loginWithPin(pin)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              iReports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resort Management Reports
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setError('') }}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label="Email & Password" />
            <Tab label="PIN Access" />
          </Tabs>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {tab === 0 ? (
              <>
                <TextField
                  label="Email address"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  fullWidth
                  required
                  variant="standard"
                  size="small"
                  slotProps={{
                    input: {
                      sx: { fontSize: 14 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  fullWidth
                  required
                  variant="standard"
                  size="small"
                  slotProps={{
                    input: {
                      sx: { fontSize: 14 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </>
            ) : (
              <TextField
                label="Staff PIN"
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError('') }}
                placeholder="Enter your 4-6 digit PIN"
                fullWidth
                required
                variant="standard"
                size="small"
                slotProps={{
                  input: {
                    sx: { fontSize: 14, textAlign: 'center', letterSpacing: 6 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <PinIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
              sx={{ mt: 1 }}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Login
