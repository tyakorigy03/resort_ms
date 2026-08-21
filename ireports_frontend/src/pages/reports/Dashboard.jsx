import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, LinearProgress, ToggleButton, ToggleButtonGroup } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import HotelIcon from '@mui/icons-material/Hotel'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { useAuth } from '../../context/AuthContext'
import { getExecutiveDashboard, getSalesByOutlet } from '../../api/reports'
import StatCard from '../../components/StatCard'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function TrendTag({ current, previous }) {
  if (!previous) return null
  const diff = current - previous
  const pct = previous ? Math.round((diff / previous) * 100) : 0
  if (diff === 0) return null
  const up = diff > 0
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, ml: 1, fontSize: 12, color: up ? '#16a34a' : '#dc2626' }}>
      {up ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
      {Math.abs(pct)}%
    </Box>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [dash, setDash] = useState(null)
  const [outletRevenue, setOutletRevenue] = useState([])
  const [roomView, setRoomView] = useState('type')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [d, o] = await Promise.all([
          getExecutiveDashboard(),
          getSalesByOutlet(today(), today()),
        ])
        if (active) { setDash(d); setOutletRevenue(o) }
      } catch (err) { console.error('Dashboard load error:', err) }
    }
    load()
    const timer = setInterval(load, 60000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  const rev = dash?.revenue
  const occ = dash?.occupancy
  const fd = dash?.front_desk

  return (
    <>
      <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.name}.
      </Typography>

      {/* Row 1: Key metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard
          label="Total Revenue"
          value={fmtMoney(rev?.total)}
          // subtext={
          //   <span>
          //     Rooms {fmtMoney(rev?.rooms)} · F&B {fmtMoney(rev?.pos)}
          //     <TrendTag current={rev?.total} previous={rev?.yesterday_total} />
          //   </span>
          // }
          icon={<AccountBalanceWalletIcon />}
          tint="#166534"
        />
        <StatCard
          label="Occupancy"
          value={`${occ?.percentage ?? 0}%`}
          subtext={`${occ?.occupied ?? 0} of ${occ?.total ?? 0} rooms`}
          icon={<HotelIcon />}
          tint="#0369a1"
        />
        <StatCard
          label="Arrivals Today"
          value={fd?.arrivals_today ?? 0}
          subtext={`${fd?.in_house ?? 0} currently in-house`}
          icon={<LoginIcon />}
          tint="#7c3aed"
        />
        <StatCard
          label="Departures Today"
          value={fd?.departures_today ?? 0}
          icon={<LogoutIcon />}
          tint="#b45309"
        />
      </Box>

      {/* Row 2: Room status + Revenue by outlet */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <HotelIcon fontSize="small" /> Room Status
              </Typography>
              <ToggleButtonGroup
                value={roomView}
                exclusive
                onChange={(_, v) => { if (v) setRoomView(v) }}
                size="small"
                sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.25, fontSize: '0.7rem', textTransform: 'none', lineHeight: 1.4 } }}
              >
                <ToggleButton value="type">By Type</ToggleButton>
                <ToggleButton value="status">By Status</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {roomView === 'type' ? (
              dash?.rooms_by_type?.length ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {dash.rooms_by_type.map((rt) => (
                    <Box key={rt.type_name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">{rt.type_name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{rt.occupied} / {rt.total}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'space-between' }}>
                        {Array.from({ length: rt.total }, (_, i) => (
                          <Box
                            key={i}
                            sx={{
                              flex: 1,
                              width: 10,
                              height: 10,
                              borderRadius: 0.5,
                              bgcolor: i < rt.occupied ? '#166534' : '#e0e0e0',
                              transition: 'background-color 0.3s ease',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Loading...</Typography>
              )
            ) : (
              occ ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { label: 'Occupied', value: occ.occupied, color: '#166534' },
                    { label: 'Clean', value: occ.clean, color: '#0ea5e9' },
                    { label: 'Dirty', value: occ.dirty, color: '#dc2626' },
                  ].map((s) => (
                    <Box key={s.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.value}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={occ.total ? (s.value / occ.total) * 100 : 0}
                        sx={{ height: 8, borderRadius: 1, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: s.color, borderRadius: 1 } }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Loading...</Typography>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Revenue Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Room Revenue</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtMoney(rev?.rooms)}</Typography>
              </Box>

              {(() => {
                const grouped = {}
                outletRevenue.forEach((r) => {
                  const type = r.outlet_type || 'other'
                  if (!grouped[type]) grouped[type] = []
                  grouped[type].push(r)
                })
                const typeLabels = {
                  restaurant: 'Food & Beverage', bar: 'Food & Beverage', lounge: 'Food & Beverage',
                  room_service: 'Food & Beverage', minibar: 'Food & Beverage',
                  spa: 'Services', laundry: 'Services', shop: 'Retail',
                }
                const sections = {}
                Object.entries(grouped).forEach(([type, outlets]) => {
                  const label = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
                  if (!sections[label]) sections[label] = { total: 0, outlets: [] }
                  outlets.forEach((o) => { sections[label].total += Number(o.revenue) || 0 })
                  sections[label].outlets.push(...outlets)
                })
                return Object.entries(sections).map(([label, data]) => (
                  <Box key={label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                      <Typography variant="body2" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtMoney(data.total)}</Typography>
                    </Box>
                    {data.outlets.map((r, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25, pl: 2 }}>
                        <Typography variant="caption" color="text.secondary">{r.outlet_name}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>{fmtMoney(r.revenue)}</Typography>
                      </Box>
                    ))}
                  </Box>
                ))
              })()}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, mt: 0.5, borderTop: '2px solid #e0e0e0' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Revenue</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtMoney(rev?.total)}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  )
}
