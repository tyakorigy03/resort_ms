import { Box, Button, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import { useKds } from './KdsShell'
import SettingsContent from './components/SettingsContent'

// Spec 4: full settings page for the KDS. The board's quick slide-over shares
// the same SettingsContent component.
export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useKds()
  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
      <Paper variant="outlined" sx={{ maxWidth: 560, mx: 'auto', p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button size="small" variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            Back to board
          </Button>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Display settings
          </Typography>
        </Box>
        <SettingsContent settings={settings} onChange={updateSettings} />
      </Paper>
    </Box>
  )
}
