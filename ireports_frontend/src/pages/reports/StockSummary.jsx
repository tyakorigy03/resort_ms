import { useEffect, useState } from 'react'
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Card, CardContent } from '@mui/material'
import { getStockSummary } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StockSummary() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    getStockSummary().then(setRows).catch(() => setRows([]))
  }, [])

  const totalValue = rows.reduce((s, r) => s + Number(r.total_value || 0), 0)

  return (
    <ReportLayout
      title="Stock Summary"
      subtitle="Current stock levels and valuation across all locations"
      filters={
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ExportButton data={rows} filename="stock-summary" />
        </Box>
      }
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Total Stock Value</Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>{fmtMoney(totalValue)}</Typography>
          <Typography variant="caption" color="text.secondary">{rows.length} items tracked</Typography>
        </CardContent>
      </Card>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell align="right">Total Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>{r.sku}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell>{r.location_name}</TableCell>
                <TableCell align="right">{Number(r.current_qty).toFixed(2)}</TableCell>
                <TableCell align="right">{fmtMoney(r.unit_cost)}</TableCell>
                <TableCell align="right">{fmtMoney(r.total_value)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">No stock data available</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ReportLayout>
  )
}
