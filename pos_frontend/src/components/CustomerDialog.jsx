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
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { api } from '../api'

export default function CustomerDialog({ open, onClose, onSelect }) {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setCreating(false)
    setSearch('')
    api
      .customers()
      .then(setCustomers)
      .catch((err) => setError(err.message))
  }, [open])

  const query = search.trim().toLowerCase()
  const visible = customers.filter(
    (c) => !query || `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) || (c.phone || '').includes(query),
  )

  async function create() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await api.createCustomer({ firstName: firstName.trim(), lastName: lastName.trim() })
      setCustomers((prev) => [...prev, created])
      setCreating(false)
      setFirstName('')
      setLastName('')
      onSelect(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Assign customer
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem', py: 0.25 }}>
            {error}
          </Alert>
        )}

        {creating ? (
          <Box>
            <TextField
              label="First name"
              size="small"
              fullWidth
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              label="Last name"
              size="small"
              fullWidth
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button onClick={() => setCreating(false)} disabled={busy} size="small">
                Back
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<PersonAddIcon />}
                disabled={busy || !firstName.trim() || !lastName.trim()}
                onClick={create}
              >
                {busy ? 'Saving…' : 'Create customer'}
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <TextField
              size="small"
              fullWidth
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <List disablePadding sx={{ mt: 1, maxHeight: 320, overflowY: 'auto' }}>
              {visible.map((c) => (
                <ListItemButton
                  key={c.id}
                  onClick={() => onSelect(c)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={`${c.firstName} ${c.lastName}`}
                    secondary={c.phone || (c.email || '')}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItemButton>
              ))}
              {visible.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No customers found.
                </Typography>
              )}
            </List>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PersonAddIcon />}
              sx={{ mt: 1 }}
              onClick={() => setCreating(true)}
            >
              New customer
            </Button>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
