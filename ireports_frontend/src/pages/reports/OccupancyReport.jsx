import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { getOccupancyReport } from '../../api/reports'
import ReportLayout, { ExportButton } from '../../components/ReportLayout'
import DateRangePicker from '../../components/DateRangePicker'
import { BarChart } from '../../components/Charts'

export default function OccupancyReport() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [start, setStart] = useState(thirtyAgo)
  const [end, setEnd] = useState(today)
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!start || !end) return
    getOccupancyReport(start, end).then(setRows).catch(() => setRows([]))
  }, [start, end])

  const avgOccupancy = rows.length
    ? (rows.reduce((s, r) => s + Number(r.occupancy_pct || 0), 0) / rows.length).toFixed(1)
    : '—'
  const avgADR = rows.length
    ? (rows.reduce((s, r) => s + Number(r.adr || 0), 0) / rows.length).toFixed(2)
    : '—'

  const chartData = rows.slice(-14).map((r) => ({
    label: r.date?.slice(5) ?? '',
    value: Number(r.occupancy_pct) || 0,
  }))

  return (
    <ReportLayout
      title="Occupancy Report"
      subtitle="Room occupancy rates, ADR, and RevPAR"
      filters={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <ExportButton data={rows} filename="occupancy-report" />
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Avg Occupancy</Typography>
          <Typography variant="h6">{avgOccupancy}%</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">Avg Daily Rate (ADR)</Typography>
          <Typography variant="h6">${avgADR}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">RevPAR</Typography>
          <Typography variant="h6">
            {avgOccupancy !== '—' && avgADR !== '—'
              ? `$${(Number(avgADR) * Number(avgOccupancy) / 100).toFixed(2)}`
              : '—'}
          </Typography>
        </CardContent></Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>Occupancy Trend (Last 14 Days)</Typography>
          <BarChart data={chartData} valueFormat={(v) => `${v.toFixed(0)}%`} height={150} />
        </CardContent>
      </Card>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Room Type</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Occupied</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Occupancy %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.room_type_name}</TableCell>
                <TableCell align="right">{r.total_rooms}</TableCell>
                <TableCell align="right">{r.occupied}</TableCell>
                <TableCell align="right">{r.available}</TableCell>
                <TableCell align="right">{Number(r.occupancy_pct).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">No data for this period</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ReportLayout>
  )
}
