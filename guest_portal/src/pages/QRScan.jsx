import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Snackbar,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import HotelIcon from '@mui/icons-material/Hotel'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import { api, saveGuestSession } from '../api'

export default function QRScan({ onToggleMode, mode }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scannerRef = useRef(null)
  const scannerContainerRef = useRef(null)
  const [mode2, setMode2] = useState('choose')
  const [roomNumber, setRoomNumber] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (searchParams.get('toast') === 'not-available') {
      setToast('The Guest App is not yet available')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  function stopScanner() {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
  }

  async function startScanner() {
    setMode2('scan')
    setError(null)

    const { Html5Qrcode } = await import('html5-qrcode')

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            stopScanner()
            handleScanResult(decodedText)
          },
          () => {},
        )
        setScannerReady(true)
      } catch (err) {
        setError('Camera access denied or unavailable. Please enter your room number manually.')
        setMode2('manual')
        setScannerReady(false)
      }
    }, 100)
  }

  function handleScanResult(text) {
    const roomMatch = text.match(/room[:\s]*(\S+)/i) || text.match(/^(\S+)$/)
    const room = roomMatch ? roomMatch[1] : text.trim()
    setRoomNumber(room)
    lookupRoom(room)
  }

  async function lookupRoom(room) {
    setError(null)
    setBusy(true)
    try {
      const { reservation } = await api.lookupRoom(room)
      saveGuestSession({ reservationId: reservation.id, roomNumber: reservation.room_number })
      navigate('/verify', { state: { reservation } })
    } catch (err) {
      setError(err.message || 'Room not found')
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      stopScanner()
      lookupRoom(roomNumber.trim())
    }
  }

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
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <HotelIcon color="primary" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Guest Portal
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Scan your room QR code or enter your room number
          </Typography>

          {mode2 === 'choose' && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box
                onClick={startScanner}
                sx={{
                  flex: 1,
                  py: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: 'primary.main', color: '#fff', '& .scan-icon': { color: '#fff' } },
                }}
              >
                <CameraAltIcon className="scan-icon" sx={{ fontSize: 36, color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Scan QR</Typography>
              </Box>
              <Box
                onClick={() => { setMode2('manual'); stopScanner() }}
                sx={{
                  flex: 1,
                  py: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <KeyboardIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Enter Room</Typography>
              </Box>
            </Box>
          )}

          {mode2 === 'scan' && (
            <Box sx={{ mb: 2 }}>
              <Box
                id="qr-reader"
                ref={scannerContainerRef}
                sx={{
                  width: '100%',
                  minHeight: 260,
                  borderRadius: 3,
                  overflow: 'hidden',
                  mb: 1,
                  '& img': { display: 'none' },
                  '& video': { borderRadius: 3 },
                  '& #qr-shaded-region': { borderRadius: 16 },
                }}
              />
              {!scannerReady && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Starting camera…</Typography>
                </Box>
              )}
              <Button
                variant="text"
                size="small"
                onClick={() => { stopScanner(); setMode2('manual'); setScannerReady(false) }}
                sx={{ mt: 1, fontSize: '0.75rem' }}
              >
                Enter room number instead
              </Button>
            </Box>
          )}

          {mode2 === 'manual' && (
            <Box sx={{ mb: 2 }}>
              <TextField
                variant="standard"
                size="small"
                label="Room number"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
                autoFocus
                sx={{ '& .MuiInputBase-input': { fontSize: '1.1rem', textAlign: 'center', letterSpacing: 4, fontWeight: 600 } }}
              />
              <Button
                variant="text"
                size="small"
                onClick={() => { setError(null); startScanner() }}
                sx={{ mt: 1, fontSize: '0.75rem' }}
              >
                Scan QR instead
              </Button>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem', textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          {(mode2 === 'manual' || mode2 === 'choose') && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={busy || !roomNumber.trim()}
              onClick={() => lookupRoom(roomNumber.trim())}
              sx={{ mt: 2, py: 1.2, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.95rem' }}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {busy ? 'Looking up room…' : 'Continue'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
