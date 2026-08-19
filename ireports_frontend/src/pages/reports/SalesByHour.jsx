import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'
import { getSalesByHour } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SalesByHour() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getSalesByHour(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const allHours = Array.from({ length: 24 }, (_, i) => {
    const found = rows.find((r) => Number(r.hour) === i)
    return { hour: i, revenue: Number(found?.revenue || 0), order_count: Number(found?.order_count || 0) }
  })

  const chartData = allHours.map((r) => ({
    label: `${r.hour}:00`,
    value: r.revenue,
  }))

  const peakHour = allHours.reduce((best, r) => r.revenue > best.revenue ? r : best, allHours[0])
  const totalRevenue = allHours.reduce((s, r) => s + r.revenue, 0)

  return (
    <ReportLayout
      title="Sales by Hour"
      subtitle="Revenue distribution by hour of day"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={allHours.map((r) => ({ hour: r.hour, revenue: r.revenue, order_count: r.order_count }))} filename="sales-by-hour" />
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Peak Hour</Typography>
          <Typography variant="h6">{peakHour.hour}:00</Typography>
          <Typography variant="caption" color="text.secondary">{fmtMoney(peakHour.revenue)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
          <Typography variant="h6">{fmtMoney(totalRevenue)}</Typography>
        </CardContent></Card>
      </Box>

      <Card>
        <CardContent>
          <BarChart data={chartData} valueFormat={(v) => `$${v.toLocaleString()}`} height={180} />
        </CardContent>
      </Card>
    </ReportLayout>
  )
}
