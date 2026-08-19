import { Avatar, Box, Card, CardContent, Typography } from '@mui/material'

export default function StatCard({ label, value, icon, tint, subtext }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: tint ?? 'primary.main' }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6" noWrap>{value}</Typography>
          {subtext && (
            <Typography variant="caption" color="text.secondary">{subtext}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
