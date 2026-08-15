import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
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
      <Card sx={{ width: '100%', maxWidth: 400, boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Point of Sale
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with your device code
            </Typography>
          </Box>

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
