import { useEffect, useState } from 'react'
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Card, CardContent } from '@mui/material'
import { getSalesByOutlet } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SalesByOutlet() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getSalesByOutlet(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const chartData = rows.map((r) => ({
    label: r.outlet_name?.slice(0, 12) ?? 'Unknown',
    value: Number(r.revenue) || 0,
  }))

  return (
    <ReportLayout
      title="Sales by Outlet"
      subtitle="Revenue comparison across outlets"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="sales-by-outlet" />
        </Box>
      }
    >
      <Box sx={{ mb: 3 }}>
        <BarChart data={chartData} valueFormat={(v) => `$${v.toLocaleString()}`} height={160} />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Outlet</TableCell>
              <TableCell align="right">Orders</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">Avg Ticket</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.outlet_name}</TableCell>
                <TableCell align="right">{r.order_count}</TableCell>
                <TableCell align="right">{fmtMoney(r.revenue)}</TableCell>
                <TableCell align="right">{fmtMoney(r.avg_ticket)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">No data for this period</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ReportLayout>
  )
}
