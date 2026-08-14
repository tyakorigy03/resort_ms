import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import { listBatches } from '../../../api/batches'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatMoney(value) {
  return money.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function InputsCell({ batch }) {
  const inputs = batch.lines.filter((l) => !l.isOutput)
  const names = inputs.map((l) => `${l.itemName} (${l.qty})`)
  const shown = names.slice(0, 2).join(', ')
  const extra = names.length - 2
  const label = extra > 0 ? `${shown} +${extra} more` : shown
  return <span title={names.join(', ')}>{label || '—'}</span>
}

export function BatchDetailsDialog({ batch, onClose }) {
  const inputs = batch.lines.filter((l) => !l.isOutput)
  const outputs = batch.lines.filter((l) => l.isOutput)
  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            margin: 0,
            width: 560,
            maxWidth: 'calc(100% - 32px)',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Batch {batch.batchRef || `#${batch.id}`}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, flex: '1 1 auto', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Recipe:</b> {batch.recipeName || '—'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Date:</b> {formatDate(batch.date)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Staff:</b> {batch.staff}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Location:</b> {batch.locationName || '—'}
          </Typography>
        </Box>

        {inputs.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', mt: 0.5 }}>
              Ingredients consumed
            </Typography>
            <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '13%' }}>
                    Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                    Unit cost
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '17%' }}>
                    Value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                    On hand now
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inputs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.itemName}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {l.qty}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(l.unitCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(l.value)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {l.onHand ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {outputs.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', mt: 0.5 }}>
              Output produced
            </Typography>
            <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: '34%' }}>Item</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '13%' }}>
                    Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                    Unit cost
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '17%' }}>
                    Value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '18%' }}>
                    On hand now
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outputs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{l.itemName}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {l.qty}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(l.unitCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(l.value)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {l.onHand ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Ingredient cost:</b> {formatMoney(batch.inputCost)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            <b>Output value:</b> {formatMoney(batch.outputCost)}
          </Typography>
        </Box>
        {batch.notes && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            <b>Notes:</b> {batch.notes}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function BatchHistory() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [days, setDays] = useState('')
  const [details, setDetails] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  useEffect(() => {
    let active = true
    setLoading(true)
    listBatches({ days })
      .then((rows) => {
        if (active) {
          setBatches(rows)
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
  }, [days])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return batches
    return batches.filter(
      (b) =>
        (b.recipeName || '').toLowerCase().includes(q) ||
        (b.batchRef || '').toLowerCase().includes(q) ||
        (b.staff || '').toLowerCase().includes(q) ||
        (b.locationName || '').toLowerCase().includes(q) ||
        b.lines.some((l) => l.itemName.toLowerCase().includes(q)),
    )
  }, [batches, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search batch history"
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Quick filter</InputLabel>
            <Select
              label="Quick filter"
              value={days}
              onChange={(event) => {
                setDays(event.target.value)
                setPage(0)
              }}
              sx={{ '& .MuiSelect-select': { fontSize: '0.78rem', py: 0.9 } }}
            >
              <MenuItem value="">All time</MenuItem>
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
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
            minWidth: 720,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '16%' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '16%' }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '22%' }}>Recipe</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ingredients</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '14%' }}>Output</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '14%' }}>
                Ingredient cost
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((batch) => (
                <TableRow
                  key={batch.id}
                  hover
                  onClick={() => setDetails(batch)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatDate(batch.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{batch.batchRef || `#${batch.id}`}</TableCell>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {batch.recipeName || '—'}
                  </TableCell>
                  <TableCell>
                    <InputsCell batch={batch} />
                  </TableCell>
                  <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {batch.outputQty > 0
                      ? `${batch.outputQty} × ${batch.lines.find((l) => l.isOutput)?.itemName ?? ''}`
                      : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(batch.inputCost)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No batches recorded.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
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

      {details && <BatchDetailsDialog batch={details} onClose={() => setDetails(null)} />}
    </Card>
  )
}

export default BatchHistory
