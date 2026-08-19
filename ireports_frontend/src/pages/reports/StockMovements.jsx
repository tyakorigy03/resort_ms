import { useEffect, useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { getStockMovements } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StockMovements() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getStockMovements(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  return (
    <ReportLayout
      title="Stock Movements"
      subtitle="Inventory movement history"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="stock-movements" />
        </Box>
      }
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Staff</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date?.slice(0, 10)}</TableCell>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>
                  <Chip
                    label={r.direction}
                    size="small"
                    color={r.direction === 'IN' ? 'success' : 'error'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{Number(r.qty).toFixed(2)}</TableCell>
                <TableCell align="right">{r.unit_cost ? fmtMoney(r.unit_cost) : '—'}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{r.reference || '—'}</TableCell>
                <TableCell>{r.staff || '—'}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">No movements for this period</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ReportLayout>
  )
}
