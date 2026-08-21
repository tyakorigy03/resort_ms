import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material'
import MailOutlinedIcon from '@mui/icons-material/MailOutlined'
import LockIcon from '@mui/icons-material/Lock'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { api, saveGuestSession, getGuestSession } from '../api'

export default function OTPVerify({ onToggleMode, mode }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [reservation, setReservation] = useState(null)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRefs = []

  useEffect(() => {
    const res = location.state?.reservation
    if (res) {
      setReservation(res)
      sendOtp(res.id)
    } else {
      const session = getGuestSession()
      if (session?.reservationId) {
        sendOtp(session.reservationId)
      } else {
        navigate('/')
      }
    }
  }, [])

  async function sendOtp(resId) {
    setSending(true)
    setError(null)
    try {
      const result = await api.requestOtp(resId)
      setOtpSent(true)
      if (result.email) {
        const parts = result.email.split('@')
        const masked = parts[0].charAt(0) + '***@' + parts[1]
        setMaskedEmail(masked)
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setSending(false)
    }
  }

  function handleDigitChange(index, value) {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)

    if (value && index < 5) {
      inputRefs[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length) {
      const newDigits = text.split('').concat(Array(6).fill('')).slice(0, 6)
      setDigits(newDigits)
      const focusIdx = Math.min(text.length, 5)
      inputRefs[focusIdx]?.focus()
    }
  }

  async function handleVerify() {
    setError(null)
    const code = digits.join('')
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    const resId = reservation?.id || getGuestSession()?.reservationId
    if (!resId) {
      navigate('/')
      return
    }

    setBusy(true)
    try {
      await api.verifyOtp(resId, code)
      setSuccess(true)
      saveGuestSession({ reservationId: resId, verified: true })
      setTimeout(() => navigate('/home'), 800)
    } catch (err) {
      setError(err.message || 'Invalid code')
      setDigits(['', '', '', '', '', ''])
      inputRefs[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  const code = digits.join('')

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        position: 'relative',
      }}
    >
      <IconButton
        onClick={onToggleMode}
        size="small"
        sx={{ position: 'absolute', top: 16, right: 16 }}
        title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
      >
        {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>

      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {success ? (
            <>
              <Box sx={{ mb: 2 }}>
                <LockIcon color="success" sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                Verified!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Taking you to your dashboard…
              </Typography>
              <CircularProgress size={24} sx={{ mt: 2 }} />
            </>
          ) : (
            <>
              <Box sx={{ mb: 1 }}>
                <MailOutlinedIcon color="primary" sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Verify Your Identity
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                We sent a 6-digit code to
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 3, color: 'primary.main' }}>
                {maskedEmail || 'your email'}
              </Typography>

              {sending ? (
                <Box sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Sending verification code…
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}
                    onPaste={handlePaste}
                  >
                    {digits.map((d, i) => (
                      <Box
                        key={i}
                        component="input"
                        ref={(el) => (inputRefs[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        sx={{
                          width: 48,
                          height: 56,
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          border: '2px solid',
                          borderColor: d ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          outline: 'none',
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          transition: 'border-color 0.2s',
                          '&:focus': { borderColor: 'primary.main' },
                        }}
                      />
                    ))}
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem', textAlign: 'left' }}>
                      {error}
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={busy || code.length !== 6}
                    onClick={handleVerify}
                    sx={{ py: 1.2, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.95rem' }}
                    startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                  >
                    {busy ? 'Verifying…' : 'Verify'}
                  </Button>

                  <Button
                    variant="text"
                    size="small"
                    disabled={sending}
                    onClick={() => {
                      const resId = reservation?.id || getGuestSession()?.reservationId
                      if (resId) sendOtp(resId)
                    }}
                    sx={{ mt: 1.5, fontSize: '0.8rem' }}
                  >
                    {sending ? 'Sending…' : 'Resend code'}
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
