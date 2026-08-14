import { Button, Grid } from '@mui/material'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export default function KeyPad({ onKey, disabled, compact = false }) {
  return (
    <Grid container spacing={compact ? 0.5 : 1} sx={{ my: compact ? 0.5 : 1 }}>
      {KEYS.map((key, i) => (
        <Grid key={i} size={4}>
          <Button
            fullWidth
            variant="outlined"
            sx={{ height: compact ? 42 : 54, fontSize: compact ? 17 : 22, fontWeight: 600 }}
            disabled={disabled || !key}
            onClick={() => onKey(key === 'back' ? 'back' : key)}
          >
            {key === 'back' ? '⌫' : key}
          </Button>
        </Grid>
      ))}
    </Grid>
  )
}
