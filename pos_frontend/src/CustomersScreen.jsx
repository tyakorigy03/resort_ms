import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import SearchIcon from '@mui/icons-material/Search'
import { api } from './api'

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    api
      .customers()
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const q = search.trim().toLowerCase()
  const visible = customers.filter(
    (c) =>
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q),
  )

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
      {error && (
        <Alert
          severity="error"
          sx={{ fontSize: '0.85rem' }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
          New customer
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No customers found.
          </Typography>
        ) : (
          <List disablePadding>
            {visible.map((c) => (
              <ListItem
                key={c.id}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 0.75, bgcolor: 'background.paper' }}
              >
                <ListItemText
                  primary={`${c.firstName} ${c.lastName}`}
                  secondary={
                    [c.phone, c.email].filter(Boolean).join(' · ') ||
                    `Customer since ${new Date(c.createdAt).toLocaleDateString()}`
                  }
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <CreateCustomerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCustomers((prev) => [created, ...prev])
          setCreateOpen(false)
        }}
      />
    </Box>
  )
}

function CreateCustomerDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm({ firstName: '', lastName: '', email: '', phone: '' })
      setError(null)
    }
  }, [open])

  async function save() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await api.createCustomer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      })
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        New customer
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
        <TextField
          label="First name"
          size="small"
          fullWidth
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          sx={{ mb: 1 }}
        />
        <TextField
          label="Last name"
          size="small"
          fullWidth
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          sx={{ mb: 1 }}
        />
        <TextField
          label="Phone"
          size="small"
          fullWidth
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          sx={{ mb: 1 }}
        />
        <TextField
          label="Email"
          size="small"
          fullWidth
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          disabled={busy || !form.firstName.trim() || !form.lastName.trim()}
          onClick={save}
        >
          {busy ? 'Saving…' : 'Create customer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
