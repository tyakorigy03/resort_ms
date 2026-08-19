import { useEffect, useState } from 'react'
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { getSalesByStaff } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SalesByStaff() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getSalesByStaff(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const chartData = rows.slice(0, 10).map((r) => ({
    label: r.staff_name?.slice(0, 12) ?? '',
    value: Number(r.total_sales) || 0,
  }))

  return (
    <ReportLayout
      title="Sales by Staff"
      subtitle="Staff performance by orders handled and total sales"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="sales-by-staff" />
        </Box>
      }
    >
      <Box sx={{ mb: 3 }}>
        <BarChart data={chartData} valueFormat={(v) => `$${v.toLocaleString()}`} height={160} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {rows.slice(0, 3).map((r, i) => (
          <Box key={i} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ fontWeight: 600, fontSize: 14 }}>{r.staff_name}</Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{r.orders_handled} orders — {fmtMoney(r.total_sales)}</Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 1, gap: 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 1, px: 1, py: 0.5, fontWeight: 600, fontSize: 13, color: 'text.secondary' }}>
          <span>Staff</span><span style={{ textAlign: 'right' }}>Orders</span><span style={{ textAlign: 'right' }}>Sales</span>
        </Box>
        {rows.map((r, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 1, px: 1, py: 0.5, fontSize: 14, '&:hover': { bgcolor: 'grey.50' }, borderRadius: 0.5 }}>
            <span>{r.staff_name}</span>
            <span style={{ textAlign: 'right' }}>{r.orders_handled}</span>
            <span style={{ textAlign: 'right' }}>{fmtMoney(r.total_sales)}</span>
          </Box>
        ))}
        {rows.length === 0 && (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>No data for this period</Box>
        )}
      </Box>
    </ReportLayout>
  )
}
