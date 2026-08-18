import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { getSalesDaily } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SalesOverview() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getSalesDaily(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const total = rows.reduce((s, r) => s + Number(r.revenue || 0), 0)
  const totalOrders = rows.reduce((s, r) => s + Number(r.order_count || 0), 0)

  return (
    <ReportLayout
      title="Sales Overview"
      subtitle="Daily revenue summary across all outlets"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="sales-overview" />
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
          <Typography variant="h6">{fmtMoney(total)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Orders</Typography>
          <Typography variant="h6">{totalOrders}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Avg Order Value</Typography>
          <Typography variant="h6">{totalOrders ? fmtMoney(total / totalOrders) : '—'}</Typography>
        </CardContent></Card>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Orders</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">Avg Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.date}>
                <TableCell>{r.date}</TableCell>
                <TableCell align="right">{r.order_count}</TableCell>
                <TableCell align="right">{fmtMoney(r.revenue)}</TableCell>
                <TableCell align="right">{fmtMoney(r.avg_order_value)}</TableCell>
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
