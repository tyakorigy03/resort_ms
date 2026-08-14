import { Box, Button, DialogActions, Typography } from '@mui/material'
import KeyPad from './KeyPad'

// PIN confirmation shown after a manager chooses to open/close a sales period.
// The manager is identified by their PIN alone — no name is shown anywhere.
// Controlled: the parent owns `pin` and clears it when the backend rejects it.
export default function PinConfirm({ pin, onChange, busy, subtitle, confirmLabel, onConfirm, onCancel }) {
  function onKey(key) {
    if (busy) return
    onChange(key === 'back' ? pin.slice(0, -1) : (pin + key).slice(0, 4))
  }

  return (
    <Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
          {subtitle}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 1.5 }}>
        {pin.padEnd(4, ' ').split('').map((ch, i) => (
          <Box
            key={i}
            sx={{
              width: 34,
              height: 42,
              border: 2,
              borderColor: ch !== ' ' ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: ch !== ' ' ? 'primary.light' : 'transparent',
              fontSize: 17,
            }}
          >
            {ch !== ' ' ? '•' : ''}
          </Box>
        ))}
      </Box>
      <KeyPad onKey={onKey} disabled={busy} compact />
      <DialogActions sx={{ px: 0, pb: 0 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy || pin.length < 4}>
          {busy ? '…' : confirmLabel}
        </Button>
      </DialogActions>
    </Box>
  )
}
