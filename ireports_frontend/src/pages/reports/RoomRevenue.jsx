import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { getRoomRevenue } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

function fmtMoney(v) {
  const n = Number(v) || 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RoomRevenue() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getRoomRevenue(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const totalRoom = rows.reduce((s, r) => s + Number(r.room_revenue || 0), 0)
  const totalFolio = rows.reduce((s, r) => s + Number(r.total_folio_charges || 0), 0)

  const chartData = rows.map((r) => ({
    label: r.room_type_name?.slice(0, 12) ?? '',
    value: Number(r.room_revenue) || 0,
  }))

  return (
    <ReportLayout
      title="Room Revenue"
      subtitle="Revenue breakdown by room type"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="room-revenue" />
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Room Revenue</Typography>
          <Typography variant="h6">{fmtMoney(totalRoom)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Total Folio Charges</Typography>
          <Typography variant="h6">{fmtMoney(totalFolio)}</Typography>
        </CardContent></Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <BarChart data={chartData} valueFormat={(v) => `$${v.toLocaleString()}`} height={150} />
        </CardContent>
      </Card>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Room Type</TableCell>
              <TableCell align="right">Room Revenue</TableCell>
              <TableCell align="right">Total Folio Charges</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.room_type_name}</TableCell>
                <TableCell align="right">{fmtMoney(r.room_revenue)}</TableCell>
                <TableCell align="right">{fmtMoney(r.total_folio_charges)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center">No data for this period</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ReportLayout>
  )
}
