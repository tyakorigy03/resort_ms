import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { getStaffShiftSummary } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StaffPerformance() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getStaffShiftSummary(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const totalHours = rows.reduce((s, r) => s + Number(r.total_hours || 0), 0)
  const totalSales = rows.reduce((s, r) => s + Number(r.total_sales || 0), 0)

  const chartData = rows.slice(0, 10).map((r) => ({
    label: r.staff_name?.slice(0, 12) ?? '',
    value: Number(r.total_sales) || 0,
  }))

  return (
    <ReportLayout
      title="Staff Performance"
      subtitle="Hours worked, orders handled, and sales by staff member"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="staff-performance" />
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Hours</Typography>
          <Typography variant="h6">{totalHours.toFixed(1)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Sales</Typography>
          <Typography variant="h6">{fmtMoney(totalSales)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Avg $/Hour</Typography>
          <Typography variant="h6">{totalHours ? fmtMoney(totalSales / totalHours) : '—'}</Typography>
        </CardContent></Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>Sales by Staff</Typography>
          <BarChart data={chartData} valueFormat={(v) => `$${v.toLocaleString()}`} height={150} />
        </CardContent>
      </Card>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Staff</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell align="right">Orders</TableCell>
              <TableCell align="right">Sales</TableCell>
              <TableCell align="right">$/Hour</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.staff_name}</TableCell>
                <TableCell align="right">{Number(r.total_hours).toFixed(1)}</TableCell>
                <TableCell align="right">{r.orders_handled}</TableCell>
                <TableCell align="right">{fmtMoney(r.total_sales)}</TableCell>
                <TableCell align="right">
                  {r.total_hours ? fmtMoney(r.total_sales / r.total_hours) : '—'}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No data for this period</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ReportLayout>
  )
}
