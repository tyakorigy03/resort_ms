import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { money } from '../format'
import PinConfirm from './PinConfirm'

export default function SalePeriodDialog({ open, onClose, period, onChanged }) {
  const [step, setStep] = useState(period ? 'view' : 'confirm')
  const [authMode, setAuthMode] = useState('confirm')
  const [managerPin, setManagerPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState('')
  const [cashReport, setCashReport] = useState(null)
  const [reportError, setReportError] = useState(null)

  useEffect(() => {
    if (open && period) {
      setReportError(null)
      api.salePeriodCash(period.id)
        .then((res) => setCashReport(res.shifts))
        .catch((err) => setReportError(err.message))
    } else {
      setCashReport(null)
      setReportError(null)
    }
  }, [open, period])

  function reset() {
    setStep(period ? 'view' : 'confirm')
    setAuthMode('confirm')
    setManagerPin('')
    setError(null)
  }

  async function openPeriod() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api.salePeriodOpen({ pin: managerPin, notes })
      onChanged()
      onClose()
    } catch (err) {
      setError(err.message)
      setManagerPin('')
    } finally {
      setBusy(false)
    }
  }

  async function closePeriod() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api.salePeriodClose(period.id, { pin: managerPin, notes })
      onChanged()
      onClose()
    } catch (err) {
      setError(err.message)
      setManagerPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {period ? 'Sales period' : 'Open sales period'}
        <IconButton onClick={onClose} size="small" disabled={busy}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }}>
            {error}
          </Alert>
        )}

        {period && step === 'view' ? (
          <Box>
            <Row label="Opened" value={fmt(period.openedAt)} />
            {period.openedByStaffName && <Row label="By" value={period.openedByStaffName} />}
            {period.openedOnDeviceName && <Row label="Device" value={period.openedOnDeviceName} />}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
              Shift cash
            </Typography>
            {reportError ? (
              <Alert severity="warning" sx={{ mb: 1, fontSize: '0.85rem', py: 0.25 }}>
                Could not load shift cash: {reportError}
              </Alert>
            ) : cashReport ? (
              cashReport.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No shifts in this period.
                </Typography>
              ) : (
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff</TableCell>
                      <TableCell align="right">Opening</TableCell>
                      <TableCell align="right">Expected</TableCell>
                      <TableCell align="right">Counted</TableCell>
                      <TableCell align="right">Variance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cashReport.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{shift.staffName}</TableCell>
                        <TableCell align="right">{money(shift.cash.opening)}</TableCell>
                        <TableCell align="right">{money(shift.cash.expected)}</TableCell>
                        <TableCell align="right">{shift.cash.closing == null ? '—' : money(shift.cash.closing)}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color:
                              shift.cash.variance == null
                                ? 'text.secondary'
                                : shift.cash.variance === 0
                                  ? 'success.main'
                                  : shift.cash.variance > 0
                                    ? 'warning.main'
                                    : 'error.main',
                          }}
                        >
                          {shift.cash.variance == null ? '—' : money(shift.cash.variance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : (
              <Typography variant="body2" color="text.secondary">
                Loading…
              </Typography>
            )}

            <TextField
              label="Closing notes"
              placeholder="Optional notes…"
              multiline
              minRows={3}
              size="small"
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mt: 1.5 }}
            />
            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" color="warning" onClick={() => { setError(null); setStep('confirm') }} disabled={busy}>
                Close period & end of day
              </Button>
            </DialogActions>
          </Box>
        ) : (
          <Box>
            {authMode === 'confirm' ? (
              <Box>
                {period ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Closing the sales period ends the day for this outlet. A manager will confirm with their PIN.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    A sales period must be open before orders can be taken. A manager will confirm with their PIN.
                  </Typography>
                )}
                <TextField
                  label={period ? 'Closing notes' : 'Opening notes'}
                  placeholder="Optional notes…"
                  multiline
                  minRows={3}
                  size="small"
                  fullWidth
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <DialogActions sx={{ px: 0, pb: 0 }}>
                  <Button onClick={reset} disabled={busy}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color={period ? 'warning' : 'primary'}
                    onClick={() => { setError(null); setAuthMode('pin') }}
                  >
                    {period ? 'Close period & end of day' : 'Open sales period'}
                  </Button>
                </DialogActions>
              </Box>
            ) : (
              <PinConfirm
                pin={managerPin}
                onChange={(p) => {
                  setManagerPin(p)
                  setError(null)
                }}
                busy={busy}
                subtitle={`Enter your PIN to confirm ${period ? 'closing' : 'opening'} the sales period`}
                confirmLabel={period ? 'Confirm close' : 'Confirm open'}
                onConfirm={period ? closePeriod : openPeriod}
                onCancel={() => {
                  setManagerPin('')
                  setError(null)
                  setAuthMode('confirm')
                }}
              />
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  )
}

function fmt(value) {
  if (!value) return ''
  return new Date(value).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
