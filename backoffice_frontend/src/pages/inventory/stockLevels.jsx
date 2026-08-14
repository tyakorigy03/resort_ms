import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { listStockLevels } from '../../api/stockLevels'
import { listLocations } from '../../api/locations'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function StockLevels() {
  const [levels, setLevels] = useState([])
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  useEffect(() => {
    listLocations()
      .then(setLocations)
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    listStockLevels({ locationId: locationId || undefined })
      .then((rows) => {
        if (active) {
          setLevels(rows)
          setLoadError('')
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [locationId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return levels
    return levels.filter(
      (row) => row.itemName.toLowerCase().includes(q) || (row.sku || '').toLowerCase().includes(q),
    )
  }, [levels, query])

  const totalValue = useMemo(
    () => levels.reduce((sum, row) => sum + (Number(row.stockValue) || 0), 0),
    [levels],
  )

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  function handleChangePage(_, newPage) {
    setPage(newPage)
  }

  function handleChangeRowsPerPage(event) {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const selectedName = locationId
    ? locations.find((loc) => loc.id === Number(locationId))?.name ?? 'Selected location'
    : 'All locations'

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search stock levels"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' }, minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Location</InputLabel>
            <Select
              label="Location"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value)
                setPage(0)
              }}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem', py: 0.9 } }}
            >
              <MenuItem value="">All locations</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.68rem', color: 'text.secondary' }}>
              Total stock value · {selectedName}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {money.format(totalValue)}
            </Typography>
          </Box>
        </Box>

        {loadError && (
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1, fontSize: '0.78rem' }}>
            {loadError}
          </Typography>
        )}

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 560,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '20%' }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '14%' }}>Location</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '10%' }}>
                On hand
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: '10%' }}>Unit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '12%' }}>
                Cost price
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '14%' }}>
                Stock value
              </TableCell>
              {!locationId && <TableCell sx={{ fontWeight: 600, width: '20%' }}>By location</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={locationId ? 6 : 7}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((row) => (
                <TableRow key={locationId ? `${row.locationId}-${row.itemId}` : row.itemId} hover>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.itemName}
                  </TableCell>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.locationName ?? 'All locations'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {row.onHand}
                  </TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell align="right">{money.format(row.costPrice)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money.format(row.stockValue)}
                  </TableCell>
                  {!locationId && (
                    <TableCell>
                      {row.locations && row.locations.length > 0
                        ? row.locations
                            .map((loc) => `${loc.locationName}: ${loc.onHand}`)
                            .join(', ')
                        : '—'}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={locationId ? 6 : 7}>No stock levels found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{
            '& .MuiTablePagination-toolbar': { minHeight: 36 },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select': {
              fontSize: '0.7rem',
            },
            '& .MuiTablePagination-selectIcon': { fontSize: 18 },
          }}
        />
      </CardContent>
    </Card>
  )
}

export default StockLevels
