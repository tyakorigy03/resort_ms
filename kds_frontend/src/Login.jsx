import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import { api, saveSession } from './api'

export default function Login({ onAuth }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError('Please enter the device code')
      return
    }
    setBusy(true)
    try {
      const session = await api.authenticate(code.trim())
      if (session.device?.deviceType !== 'kds') {
        setError('This code is not a kitchen display device.')
        setCode('')
        return
      }
      saveSession({ token: session.token, device: session.device })
      onAuth(session)
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
      setCode('')
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
            <RestaurantMenuIcon color="primary" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Kitchen Display
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in with your display device code
          </Typography>

          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column' }}>
            <TextField
              label="Device code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              placeholder="Enter device code"
              variant="standard"
              size="small"
              fullWidth
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2, fontSize: '0.85rem', py: 0.25 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy || !code}
              sx={{ mt: 3, textTransform: 'uppercase', fontWeight: 600 }}
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
