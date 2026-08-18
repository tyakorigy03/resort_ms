import { useEffect, useState } from 'react'
import { Avatar, Box, Card, CardContent, Typography } from '@mui/material'
import PaymentsIcon from '@mui/icons-material/Payments'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import { useAuth } from '../context/AuthContext'
import { getPosStats } from '../api/posOrders'

function formatMoney(value) {
  const n = Number(value) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({ label, value, icon, tint }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: tint ?? 'primary.main' }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6">{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await getPosStats()
        if (active) setStats(data)
      } catch {
        /* backend may be offline; keep last value */
      }
    }
    load()
    const timer = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.name}. Here is an overview of the resort.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <StatCard
          label="Open orders"
          value={stats ? stats.openOrders : '—'}
          icon={<RestaurantMenuIcon />}
        />
        <StatCard
          label="Open tables"
          value={stats ? stats.openTables : '—'}
          icon={<TableRestaurantIcon />}
          tint="#166534"
        />
        <StatCard
          label="Revenue today"
          value={stats ? formatMoney(stats.revenueToday) : '—'}
          icon={<PaymentsIcon />}
          tint="#b45309"
        />
        <StatCard
          label="Orders today"
          value={stats ? stats.ordersToday : '—'}
          icon={<ReceiptLongIcon />}
          tint="#3730a3"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
        <StatCard
          label="Kitchen items in progress"
          value={stats ? stats.kitchenActive : '—'}
          icon={<WhatshotIcon />}
          tint="#b91c1c"
        />
        <StatCard
          label="Floor plans"
          value={stats ? stats.floorPlans : '—'}
          icon={<StickyNote2Icon />}
          tint="#0e7490"
        />
        <StatCard
          label="Restaurant tables"
          value={stats ? stats.restaurantTables : '—'}
          icon={<TableRestaurantIcon />}
          tint="#4b5563"
        />
      </Box>
    </>
  )
}

export default Dashboard
