import { Box, IconButton, TextField } from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'

// Number input with a - button on the left and a + button on the right so
// quantities can be adjusted without the keyboard.
function StepperInput({ value, onChange, step = 1, min = 0, width = 40 }) {
  function stepValue(direction) {
    const current = Number(value) || 0
    const next = Math.round((current + direction * step) * 1000) / 1000
    onChange(String(Math.max(min, next)))
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <IconButton
        size="small"
        aria-label="decrease"
        onClick={() => stepValue(-1)}
        sx={{ p: 0.15, borderRadius: 0, minWidth: 24, width: 24, height: 24 }}
      >
        <RemoveIcon sx={{ fontSize: 12 }} />
      </IconButton>
      <TextField
        variant="standard"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          '& .MuiInputBase-input': {
            fontSize: '0.75rem',
            textAlign: 'center',
            width,
            py: 0.25,
            px: 0,
            fontVariantNumeric: 'tabular-nums',
          },
          '& .MuiInput-root:before, & .MuiInput-root:after': { display: 'none' },
        }}
      />
      <IconButton
        size="small"
        aria-label="increase"
        onClick={() => stepValue(1)}
        sx={{ p: 0.15, borderRadius: 0, minWidth: 24, width: 24, height: 24 }}
      >
        <AddIcon sx={{ fontSize: 12 }} />
      </IconButton>
    </Box>
  )
}

export default StepperInput
