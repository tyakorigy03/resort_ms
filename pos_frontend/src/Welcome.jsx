import { Avatar, Box, Button, Chip, Typography } from '@mui/material'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import logo from './assets/logo.png'

export default function Welcome({ device, onClockInOut }) {
  return (
    <Box sx={{ height: '100svh', display: 'flex', bgcolor: 'background.default' }}>
      <Box
        sx={{
          width: '33.333%',
          height: '100%',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          p: 3,
          overflow: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <img src={logo} alt="Resort MS" style={{ height: 40, width: 'auto' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Resort MS
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Device info
        </Typography>
        <InfoRow label="Name" value={device?.name} />
        <InfoRow label="Code" value={device?.code} />
        <InfoRow label="Type" value={device?.deviceType} capitalize />
        <InfoRow label="Outlet" value={device?.outletName} />
        <InfoRow label="Production center" value={device?.productionCenterName} />
        <InfoRow label="IP address" value={device?.ipAddress} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Status
          </Typography>
          <Chip
            label={device?.isActive ? 'Active' : 'Inactive'}
            size="small"
            color={device?.isActive ? 'success' : 'error'}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, fontSize: 11 }}>
          © {new Date().getFullYear()} Resort MS
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Avatar sx={{ width: 140, height: 140, bgcolor: 'primary.light', color: 'primary.main', mb: 2 }}>
          <PointOfSaleIcon sx={{ fontSize: 84 }} />
        </Avatar>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Welcome
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, mt: 1 }}>
          Clock in to start your shift and begin taking orders at the register.
        </Typography>
        <Button
          variant="contained"
          size="large"
          color="success"
          onClick={onClockInOut}
          sx={{ mt: 3, px: 7, py: 1.5, fontSize: 17, fontWeight: 700, textTransform: 'none' }}
        >
          Clock in/out
        </Button>
      </Box>
    </Box>
  )
}

function InfoRow({ label, value, capitalize }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, textAlign: 'right', textTransform: capitalize ? 'capitalize' : 'none' }}
      >
        {value || '—'}
      </Typography>
    </Box>
  )
}
