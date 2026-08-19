import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'
import PaymentsIcon from '@mui/icons-material/Payments'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import HotelIcon from '@mui/icons-material/Hotel'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { useAuth } from '../../context/AuthContext'
import { getExecutiveDashboard, getRevenueTrend } from '../../api/reports'
import StatCard from '../../components/StatCard'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [dash, setDash] = useState(null)
  const [trend, setTrend] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [d, t] = await Promise.all([getExecutiveDashboard(), getRevenueTrend(14)])
        if (active) { setDash(d); setTrend(t) }
      } catch { /* keep last */ }
    }
    load()
    const timer = setInterval(load, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  const trendData = trend.reverse().map((d) => ({
    label: d.date?.slice(5) ?? '',
    value: Number(d.revenue) || 0,
  }))

  return (
    <>
      <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        Executive Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.name}. Here is today's overview.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label="Revenue Today" value={dash ? fmtMoney(dash.revenue) : '—'} icon={<PaymentsIcon />} tint="#b45309" />
        <StatCard label="Orders Today" value={dash?.orderCount ?? '—'} icon={<ReceiptLongIcon />} tint="#3730a3" />
        <StatCard label="Open Orders" value={dash?.openOrders ?? '—'} icon={<RestaurantMenuIcon />} tint="#b91c1c" />
        <StatCard label="In-House Guests" value={dash?.inHouseGuests ?? '—'} icon={<HotelIcon />} tint="#166534" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label="Arrivals Today" value={dash?.arrivalsToday ?? '—'} icon={<LoginIcon />} tint="#0e7490" />
        <StatCard label="Departures Today" value={dash?.departuresToday ?? '—'} icon={<LogoutIcon />} tint="#6b21a8" />
        <StatCard label="Pending POs" value={dash?.pendingPOs ?? '—'} icon={<ShoppingCartIcon />} tint="#4b5563" />
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon fontSize="small" /> Revenue Trend (Last 14 Days)
          </Typography>
          <BarChart
            data={trendData}
            valueFormat={(v) => `$${v.toLocaleString()}`}
            height={180}
          />
        </CardContent>
      </Card>
    </>
  )
}
