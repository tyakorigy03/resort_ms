import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import { fetchPurchaseReport, fetchSupplierPurchaseReport, fetchItemPurchaseReport } from '../../../api/purchases'
import { BarChart, LineChart } from '../../../components/Charts'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatMoney(value) {
  return money.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

const chipColors = {
  draft: 'default',
  sent: 'info',
  received: 'success',
}

function StatusChip({ status }) {
  return (
    <Chip
      size="small"
      label={status}
      color={chipColors[status] || 'default'}
      sx={{ height: 20, fontSize: '0.66rem', '& .MuiChip-label': { px: 1 } }}
    />
  )
}

function SummaryCard({ label, value, sub }) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 0', minWidth: { xs: 140, sm: 160 }, borderRadius: 2 }}>
      <CardContent sx={{ p: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value }) {
  return (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: 120,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
        {value}
      </Typography>
    </Box>
  )
}

function SupplierDetailDialog({ supplierId, days, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setData(null)
    fetchSupplierPurchaseReport(supplierId, { days })
      .then((rows) => {
        if (active) {
          setData(rows)
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [supplierId, days])

  const monthly = useMemo(
    () =>
      (data?.monthly || []).map((m) => ({
        label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        value: m.value,
      })),
    [data],
  )

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            margin: 0,
            width: { xs: '100%', sm: 680 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100%)', sm: 680 },
            maxHeight: { xs: 'calc(100dvh)', sm: '90vh' },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Supplier history
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'text.secondary', p: 0.25, '&:hover': { color: 'text.primary' } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        )}
        {error && (
          <Typography variant="body2" sx={{ color: 'error.main', fontSize: '0.8rem' }}>
            {error}
          </Typography>
        )}
        {data && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {data.supplier.name}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 1 }}>
              {[data.supplier.email, data.supplier.contact].filter(Boolean).join(' · ') || 'No contact info'}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <MetricCard label="Orders" value={data.metrics.poCount} />
              <MetricCard label="Ordered value" value={formatMoney(data.metrics.totalValue)} />
              <MetricCard label="Received value" value={formatMoney(data.metrics.receivedValue)} />
              <MetricCard label="Pending orders" value={data.metrics.pendingCount} />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.5 }}>
              Ordered value by month
            </Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1, mb: 1.5 }}>
              <BarChart data={monthly} valueFormat={(v) => formatMoney(v)} height={150} />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.5 }}>
              Orders
            </Typography>
            <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>PO</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Total value
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>No orders in this period.</TableCell>
                  </TableRow>
                )}
                {data.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(o.date)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{o.poNumber || '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={o.status} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      {o.items.map((it) => (
                        <Typography
                          key={it.itemName}
                          component="div"
                          variant="caption"
                          sx={{ fontSize: '0.7rem', lineHeight: 1.45, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {it.itemName} : {o.status === 'received' ? it.receivedQty ?? it.qty : it.qty}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(o.totalValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ItemDetailDialog({ itemId, days, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setData(null)
    fetchItemPurchaseReport(itemId, { days })
      .then((rows) => {
        if (active) {
          setData(rows)
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [itemId, days])

  const priceData = useMemo(
    () =>
      (data?.priceHistory || []).map((p) => ({
        label: formatDate(p.effectiveFrom),
        value: p.costPrice,
        sell: p.sellingPrice,
      })),
    [data],
  )

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            margin: 0,
            width: { xs: '100%', sm: 640 },
            height: { xs: '100vh', sm: 'auto' },
            maxWidth: { xs: 'calc(100%)', sm: 640 },
            maxHeight: { xs: 'calc(100dvh)', sm: '90vh' },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Item purchasing history
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'text.secondary', p: 0.25, '&:hover': { color: 'text.primary' } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        )}
        {error && (
          <Typography variant="body2" sx={{ color: 'error.main', fontSize: '0.8rem' }}>
            {error}
          </Typography>
        )}
        {data && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {data.item.name}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 1 }}>
              {data.item.sku}
              {data.item.unit ? ` · ${data.item.unit}` : ''}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <MetricCard label="Receipts" value={data.metrics.poCount} />
              <MetricCard label="Received qty" value={data.metrics.receivedQty} />
              <MetricCard label="Received value" value={formatMoney(data.metrics.receivedValue)} />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.5 }}>
              Price timeline
            </Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1, mb: 1 }}>
              <LineChart
                data={priceData}
                height={200}
                series={[
                  { key: 'value', color: '#1976d2' },
                  { key: 'sell', color: '#2e7d32' },
                ]}
              />
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#1976d2' }}>
                  ● Cost price
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#2e7d32' }}>
                  ● Selling price
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.5 }}>
              Receipts
            </Typography>
            <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>PO</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Received qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Unit cost
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Value
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.receipts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>No receipts in this period.</TableCell>
                  </TableRow>
                )}
                {data.receipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(r.date)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.poNumber || '—'}</TableCell>
                    <TableCell>{r.supplierName || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.receivedQty}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(r.unitCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(r.receivedQty * r.unitCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
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

function PurchaseReports() {
  const [days, setDays] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [supplierDetail, setSupplierDetail] = useState(null)
  const [itemDetail, setItemDetail] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPurchaseReport({ days })
      .then((data) => {
        if (active) {
          setReport(data)
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

  const periodLabel = useMemo(() => {
    if (!days) return 'all time'
    if (days === '7') return 'last 7 days'
    if (days === '30') return 'last 30 days'
    if (days === '90') return 'last 90 days'
    return ''
  }, [days])

  if (loading && !report) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            Loading report...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ color: 'error.main', fontSize: '0.8rem' }}>
            {loadError}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const counts = report.counts
  const summary = report.summary

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Card>
        <CardContent sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              Purchase report
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {periodLabel}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Period</InputLabel>
              <Select
                label="Period"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                sx={{ '& .MuiSelect-select': { fontSize: '0.78rem', py: 0.9 } }}
              >
                <MenuItem value="">All time</MenuItem>
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            <SummaryCard label="Purchase orders" value={counts.total} />
            <SummaryCard label="Draft" value={counts.draft} />
            <SummaryCard label="Sent" value={counts.sent} />
            <SummaryCard
              label="Received value"
              value={formatMoney(summary.receivedValue)}
              sub={`${summary.receivedCount} receipts`}
            />
            <SummaryCard label="Received qty" value={summary.receivedQty} />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
            By supplier
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary', display: 'block', mb: 1 }}>
            Click a supplier to see their orders, metrics and charts.
          </Typography>
          <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Purchase orders
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Received qty
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Received value
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  History
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.bySupplier.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No purchases in this period.</TableCell>
                </TableRow>
              )}
              {report.bySupplier.map((row) => (
                <TableRow
                  key={row.supplierId ?? 'none'}
                  hover
                  onClick={() => row.supplierId && setSupplierDetail(row.supplierId)}
                  sx={{ cursor: row.supplierId ? 'pointer' : 'default' }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{row.supplierName}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.poCount}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.receivedQty}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(row.receivedValue)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Supplier history"
                      disabled={!row.supplierId}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (row.supplierId) setSupplierDetail(row.supplierId)
                      }}
                    >
                      <HistoryIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
            By item
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary', display: 'block', mb: 1 }}>
            Click an item to see its purchasing history and price timeline.
          </Typography>
          <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Received qty
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Received value
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  History
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.byItem.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No items received in this period.</TableCell>
                </TableRow>
              )}
              {report.byItem.map((row) => (
                <TableRow
                  key={row.itemId}
                  hover
                  onClick={() => setItemDetail(row.itemId)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{row.itemName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{row.sku}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.receivedQty}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(row.receivedValue)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Item history"
                      onClick={(e) => {
                        e.stopPropagation()
                        setItemDetail(row.itemId)
                      }}
                    >
                      <HistoryIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {supplierDetail && (
        <SupplierDetailDialog
          supplierId={supplierDetail}
          days={days}
          onClose={() => setSupplierDetail(null)}
        />
      )}
      {itemDetail && (
        <ItemDetailDialog itemId={itemDetail} days={days} onClose={() => setItemDetail(null)} />
      )}
    </Box>
  )
}

export default PurchaseReports
