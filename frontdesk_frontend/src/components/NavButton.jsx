import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@mui/material'

export default function NavButton({ to, icon, label, end }) {
  const navigate = useNavigate()
  const location = useLocation()
  const active = end ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <Button
      size="small"
      color={active ? 'primary' : 'inherit'}
      onClick={() => navigate(to)}
      startIcon={icon}
      sx={{ color: active ? 'primary.main' : 'text.primary', fontWeight: 600 }}
    >
      {label}
    </Button>
  )
}
