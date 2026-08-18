import { useEffect, useState } from 'react'
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { getSalesByItem } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SalesByItem() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getSalesByItem(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const chartData = rows.slice(0, 10).map((r) => ({
    label: r.item_name?.slice(0, 10) ?? '',
    value: Number(r.total_revenue) || 0,
  }))

  return (
    <ReportLayout
      title="Sales by Item"
      subtitle="Top selling items by revenue"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="sales-by-item" />
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
              <TableCell>Item</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Qty Sold</TableCell>
              <TableCell align="right">Revenue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell align="right">{r.quantity_sold}</TableCell>
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
