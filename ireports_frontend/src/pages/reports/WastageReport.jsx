import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { getWastageSummary } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function WastageReport() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!start || !end) return
    getWastageSummary(start, end).then(setData).catch(() => setData(null))
  }, [start, end])

  const byReason = data?.byReason || []
  const byItem = data?.byItem || []

  return (
    <ReportLayout
      title="Wastage Report"
      subtitle="Stock wastage summary by reason and item"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={[...byReason, ...byItem]} filename="wastage-report" />
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Wastage Qty</Typography>
          <Typography variant="h6">{Number(data?.totalQty || 0).toFixed(2)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Wastage Cost</Typography>
          <Typography variant="h6">{fmtMoney(data?.totalCost)}</Typography>
        </CardContent></Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>By Reason</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byReason.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell align="right">{Number(r.total_qty).toFixed(2)}</TableCell>
                    <TableCell align="right">{fmtMoney(r.total_cost)}</TableCell>
                  </TableRow>
                ))}
                {byReason.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>By Item</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byItem.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.item_name}</TableCell>
                    <TableCell align="right">{Number(r.total_qty).toFixed(2)}</TableCell>
                    <TableCell align="right">{fmtMoney(r.total_cost)}</TableCell>
                  </TableRow>
                ))}
                {byItem.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </ReportLayout>
  )
}
