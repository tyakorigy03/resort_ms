import { Box, Drawer, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SettingsContent, { DEFAULTS } from './SettingsContent'

// Quick settings slide-over (spec 4); the full page lives at /settings.
export default function SettingsDrawer({ open, onClose, settings, onChange }) {
  const s = settings || DEFAULTS
  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 340 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Display settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto' }}>
        <SettingsContent settings={s} onChange={onChange} />
      </Box>
    </Drawer>
  )
}
