import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { getMenuPerformance } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function MenuPerformance() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getMenuPerformance(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const chartData = rows.slice(0, 10).map((r) => ({
    label: r.item_name?.slice(0, 12) ?? '',
    value: Number(r.times_sold) || 0,
  }))

  return (
    <ReportLayout
      title="Menu Performance"
      subtitle="Item popularity and revenue by accounting group"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="menu-performance" />
        </Box>
      }
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>Top 10 Items by Quantity Sold</Typography>
          <BarChart data={chartData} valueFormat={(v) => v.toLocaleString()} height={160} />
        </CardContent>
      </Card>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Accounting Group</TableCell>
              <TableCell align="right">Times Sold</TableCell>
              <TableCell align="right">Revenue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>{r.accounting_group}</TableCell>
                <TableCell align="right">{r.times_sold}</TableCell>
                <TableCell align="right">{fmtMoney(r.total_revenue)}</TableCell>
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
