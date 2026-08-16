import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import HotelIcon from '@mui/icons-material/Hotel'
import { api, saveSession } from './api'

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter your email and password')
      return
    }
    setBusy(true)
    try {
      const session = await api.login(email.trim(), password)
      saveSession({ token: session.token, user: session.user })
      onAuth(session.user)
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
      setPassword('')
    } finally {
      setBusy(false)
    }
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
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <HotelIcon color="primary" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Front Desk
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to manage reservations and guest folios
          </Typography>

          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="standard"
              size="small"
              fullWidth
              autoFocus
              autoComplete="email"
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="standard"
              size="small"
              fullWidth
              autoComplete="current-password"
            />
            {error && (
              <Alert severity="error" sx={{ fontSize: '0.85rem', py: 0.25 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy || !email || !password}
              sx={{ mt: 1, textTransform: 'uppercase', fontWeight: 600 }}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
