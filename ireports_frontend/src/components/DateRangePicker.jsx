import { useState } from 'react'
import { Box, Button, Menu, MenuItem, TextField, Typography } from '@mui/material'
import DateRangeIcon from '@mui/icons-material/DateRange'

const presets = [
  { label: 'Today', getRange: () => { const d = new Date(); return [fmt(d), fmt(d)] } },
  { label: 'Last 7 days', getRange: () => [fmt(new Date(Date.now() - 7 * 864e5)), fmt(new Date())] },
  { label: 'Last 30 days', getRange: () => [fmt(new Date(Date.now() - 30 * 864e5)), fmt(new Date())] },
  { label: 'This month', getRange: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), fmt(d)] } },
  { label: 'Last month', getRange: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); const e = new Date(d.getFullYear(), d.getMonth(), 0); return [fmt(s), fmt(e)] } },
  { label: 'This year', getRange: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), 0, 1)), fmt(d)] } },
]

function fmt(d) {
  return d.toISOString().slice(0, 10)
}

export default function DateRangePicker({ start, end, onChange }) {
  const [anchor, setAnchor] = useState(null)

  function applyPreset(p) {
    const [s, e] = p.getRange()
    onChange(s, e)
    setAnchor(null)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <DateRangeIcon fontSize="small" />
      </Typography>
      <TextField
        type="date"
        size="small"
        label="From"
        value={start || ''}
        onChange={(e) => onChange(e.target.value, end)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 150 }}
      />
      <TextField
        type="date"
        size="small"
        label="To"
        value={end || ''}
        onChange={(e) => onChange(start, e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 150 }}
      />
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Presets
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {presets.map((p) => (
          <MenuItem key={p.label} onClick={() => applyPreset(p)}>{p.label}</MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
