import { Box, Typography } from '@mui/material'
import Inventory2Icon from '@mui/icons-material/Inventory2'

function Inventory() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 220,
          height: 220,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: '#fff',
          boxShadow: 3,
        }}
      >
        <Inventory2Icon sx={{ fontSize: 120 }} />
      </Box>
      <Typography
        variant="h6"
        sx={{ mt: 'auto', pt: 4, color: 'text.secondary', fontWeight: 500 }}
      >
        Welcome to the inventory
      </Typography>
    </Box>
  )
}

export default Inventory
