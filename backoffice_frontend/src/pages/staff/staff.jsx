import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import QrCodeIcon from '@mui/icons-material/QrCode'
import SearchIcon from '@mui/icons-material/Search'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { QRCodeCanvas } from 'qrcode.react'
import {
  createStaff,
  createStaffUser,
  deleteStaff,
  getStaffQr,
  linkStaffUser,
  listStaff,
  listStaffRoles,
  setStaffPin,
  unlinkStaffUser,
  updateStaff,
} from '../../api/staff'
import { listUsers } from '../../api/users'
import { useToast } from '../../components/Toast'

const inputSx = {
  '& .MuiInputBase-input': { fontSize: '0.78rem' },
  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
}

function StaffDialog({ staff = null, onSave, onClose }) {
  const [form, setForm] = useState({
    firstName: staff?.firstName ?? '',
    lastName: staff?.lastName ?? '',
    position: staff?.position ?? '',
    roleId: staff?.roleId ?? '',
    department: staff?.department ?? '',
    phone: staff?.phone ?? '',
    email: staff?.email ?? '',
    hireDate: staff?.hireDate ?? '',
    notes: staff?.notes ?? '',
    isActive: staff?.isActive ?? true,
  })
  const [roles, setRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listStaffRoles()
      .then(setRoles)
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position.trim() || null,
        roleId: form.roleId || null,
        department: form.department.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        hireDate: form.hireDate || null,
        notes: form.notes.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Failed to save staff member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 400, maxWidth: 400 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {staff ? 'Edit staff member' : 'New staff member'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            autoFocus
            variant="standard"
            size="small"
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            sx={inputSx}
          />
          <TextField
            variant="standard"
            size="small"
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            sx={inputSx}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            variant="standard"
            size="small"
            label="Position"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            sx={inputSx}
          />
          <FormControl size="small" sx={{ flexGrow: 1, minWidth: 0 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>Role</InputLabel>
            <Select
              variant="standard"
              value={form.roleId}
              onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
              sx={inputSx}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            variant="standard"
            size="small"
            label="Department"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            sx={inputSx}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            variant="standard"
            size="small"
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            sx={inputSx}
          />
          <TextField
            variant="standard"
            size="small"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            sx={inputSx}
          />
        </Box>
        <TextField
          variant="standard"
          size="small"
          label="Hire date"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={form.hireDate}
          onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
          sx={inputSx}
        />
        <TextField
          variant="standard"
          size="small"
          label="Notes"
          multiline
          minRows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          sx={inputSx}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          }
          label="Active"
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.78rem' } }}
        />
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function StaffAccessDialog({ staff, onClose }) {
  const showToast = useToast()
  const [pin, setPin] = useState('')
  const [qrCode, setQrCode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!staff) return
    setQrCode(null)
    setError('')
    getStaffQr(staff.id)
      .then(({ qrCode }) => setQrCode(qrCode))
      .catch((err) => setError(err.message || 'Failed to load QR code'))
  }, [staff])

  async function handleSavePin() {
    if (!/^\d{4}$/.test(pin.trim())) {
      setError('PIN must be exactly 4 digits')
      return
    }
    setSaving(true)
    setError('')
    try {
      await setStaffPin(staff.id, pin.trim())
      showToast('Staff PIN saved')
      setPin('')
    } catch (err) {
      setError(err.message || 'Failed to save PIN')
    } finally {
      setSaving(false)
    }
  }

  async function copyQr() {
    if (!qrCode) return
    try {
      await navigator.clipboard.writeText(qrCode)
      showToast('QR code copied')
    } catch {
      showToast('Could not copy QR code', 'error')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 380, maxWidth: 380 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Clock-in access — {staff.firstName} {staff.lastName}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.72rem', color: 'text.secondary' }}>
          QR badge
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: 2,
              p: 1,
              bgcolor: '#fff',
              lineHeight: 0,
            }}
          >
            {qrCode ? (
              <QRCodeCanvas value={qrCode} size={120} includeMargin={false} />
            ) : (
              <Box sx={{ width: 120, height: 120, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
                <Typography variant="caption">…</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', wordBreak: 'break-all' }}>
              {qrCode || 'Loading…'}
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
              onClick={copyQr}
              disabled={!qrCode}
              sx={{ fontSize: '0.7rem' }}
            >
              Copy
            </Button>
          </Box>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.72rem', color: 'text.secondary', mt: 1 }}>
          PIN code
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
          {staff.hasPin ? 'A PIN is currently set. Enter a new one to replace it.' : 'No PIN set yet.'}
        </Typography>
        <TextField
          variant="standard"
          size="small"
          label="PIN (4 digits)"
          type="password"
          inputProps={{ maxLength: 6 }}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSavePin()
          }}
          sx={inputSx}
        />
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={onClose}>
          Done
        </Button>
        <Button size="small" variant="contained" color="primary" onClick={handleSavePin} disabled={saving}>
          Save PIN
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function StaffDetailsDialog({ staff, staffList, onClose, onChanged, onAccess }) {
  const showToast = useToast()
  const [users, setUsers] = useState([])
  const [linkId, setLinkId] = useState('')
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'staff' })
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listUsers({ includeInactive: true })
      .then((rows) => setUsers(rows))
      .catch(() => {})
  }, [])

  const availableUsers = users.filter(
    (u) => !staffList.some((s) => s.userId === u.id && s.id !== staff.id),
  )

  const infoRows = [
    ['Position', staff.position || '—'],
    ['Role', staff.roleName || '—'],
    ['Department', staff.department || '—'],
    ['Phone', staff.phone || '—'],
    ['Email', staff.email || '—'],
    ['Hire date', staff.hireDate || '—'],
    ['Created', new Date(staff.createdAt).toLocaleDateString()],
  ]

  async function doLink() {
    if (!linkId) return
    setBusy(true)
    setError('')
    try {
      await linkStaffUser(staff.id, linkId)
      showToast('User account linked')
      onChanged()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to link user')
    } finally {
      setBusy(false)
    }
  }

  async function doUnlink() {
    setBusy(true)
    setError('')
    try {
      await unlinkStaffUser(staff.id)
      showToast('User account unlinked')
      onChanged()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to unlink user')
    } finally {
      setBusy(false)
    }
  }

  async function doCreate() {
    if (!createForm.email.trim() || !createForm.password) {
      setError('Email and password are required')
      return
    }
    setBusy(true)
    setError('')
    try {
      await createStaffUser(staff.id, {
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      })
      showToast('User account created and linked')
      onChanged()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create user account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 2, width: 460, maxWidth: 460 } } }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Staff details
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {staff.firstName} {staff.lastName}
          </Typography>
          {staff.position && (
            <Chip label={staff.position} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#fef3c7' }} />
          )}
          <Chip
            label={staff.isActive ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              color: staff.isActive ? 'success.main' : 'text.secondary',
            }}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          {infoRows.map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.62rem' }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>

        {staff.notes && (
          <Box>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.62rem' }}>
              Notes
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
              {staff.notes}
            </Typography>
          </Box>
        )}

        <Divider />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.72rem', color: 'text.secondary' }}>
            User account
          </Typography>
          <Button size="small" startIcon={<QrCodeIcon sx={{ fontSize: 14 }} />} onClick={() => onAccess(staff)} sx={{ fontSize: '0.7rem' }}>
            Clock-in access
          </Button>
        </Box>

        {staff.userId ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>
                {staff.userName || staff.userEmail}
              </Typography>
              <Chip label={staff.userRole} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#dcfce7' }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
              {staff.userEmail}
            </Typography>
            {confirmUnlink ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', flexGrow: 1 }}>
                  Unlink? The user account stays — only the link is removed.
                </Typography>
                <Button size="small" variant="contained" color="error" onClick={doUnlink} disabled={busy} sx={{ fontSize: '0.7rem' }}>
                  Unlink
                </Button>
                <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6', fontSize: '0.7rem' }} onClick={() => setConfirmUnlink(false)}>
                  Keep
                </Button>
              </Box>
            ) : (
              <Button
                size="small"
                startIcon={<LinkOffIcon sx={{ fontSize: 14 }} />}
                onClick={() => setConfirmUnlink(true)}
                sx={{ alignSelf: 'flex-start', fontSize: '0.7rem' }}
              >
                Unlink
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {availableUsers.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                No unassigned user accounts available.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Link an existing user</InputLabel>
                  <Select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    sx={inputSx}
                    MenuProps={{ slotProps: { paper: { sx: { maxHeight: 260 } } } }}
                  >
                    {availableUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name} — {u.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button size="small" variant="contained" onClick={doLink} disabled={!linkId || busy} sx={{ fontSize: '0.7rem' }}>
                  Link
                </Button>
              </Box>
            )}

            <Divider>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                or create a new account
              </Typography>
            </Divider>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                variant="standard"
                size="small"
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                sx={inputSx}
              />
              <TextField
                variant="standard"
                size="small"
                label="Password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                sx={inputSx}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Access level</InputLabel>
                <Select
                  variant="standard"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  sx={inputSx}
                >
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <Button size="small" variant="contained" color="primary" onClick={doCreate} disabled={busy} sx={{ fontSize: '0.7rem' }}>
                Create & link
              </Button>
            </Box>
          </Box>
        )}

        {error && (
          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Staff() {
  const showToast = useToast()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState({ open: false, staff: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [accessFor, setAccessFor] = useState(null)
  const [details, setDetails] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const refresh = useCallback(() => {
    setLoading(true)
    listStaff()
      .then((rows) => setStaff(rows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return staff
    return staff.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.position || '').toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.userEmail || '').toLowerCase().includes(q),
    )
  }, [staff, query])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  async function handleSave(data) {
    if (dialog.staff) {
      await updateStaff(dialog.staff.id, data)
      showToast('Staff member updated')
    } else {
      await createStaff(data)
      showToast('Staff member created')
    }
    setDialog({ open: false, staff: null })
    refresh()
  }

  async function toggleActive(s) {
    try {
      await updateStaff(s.id, { ...s, isActive: !s.isActive })
      showToast(s.isActive ? 'Staff member deactivated' : 'Staff member activated')
      refresh()
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteStaff(confirmDelete.id)
      showToast('Staff member deleted')
      setConfirmDelete(null)
      refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete staff member', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search staff"
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
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialog({ open: true, staff: null })}
          >
            New Staff
          </Button>
        </Box>

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
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((s) => (
                <TableRow
                  key={s.id}
                  hover
                  onClick={() => setDetails(s)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
                    {s.firstName} {s.lastName}
                    {s.notes && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem' }}>
                        {s.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{s.position || '—'}</TableCell>
                  <TableCell>
                    <Chip label={s.department || '—'} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#fef3c7' }} />
                  </TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={s.isActive}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleActive(s)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title={s.hasPin ? 'PIN set' : 'No PIN — set access'}
                      onClick={(e) => {
                        e.stopPropagation()
                        setAccessFor(s)
                      }}
                      sx={{ color: s.hasPin ? 'success.main' : 'text.disabled' }}
                    >
                      <QrCodeIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDialog({ open: true, staff: s })
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(s)
                      }}
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No staff members found.</TableCell>
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
          }}
        />
      </CardContent>

      {dialog.open && (
        <StaffDialog
          staff={dialog.staff}
          onSave={handleSave}
          onClose={() => setDialog({ open: false, staff: null })}
        />
      )}

      {accessFor && (
        <StaffAccessDialog staff={accessFor} onClose={() => setAccessFor(null)} />
      )}

      {details && (
        <StaffDetailsDialog
          staff={details}
          staffList={staff}
          onClose={() => setDetails(null)}
          onChanged={refresh}
          onAccess={(s) => {
            setDetails(null)
            setAccessFor(s)
          }}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete staff member
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.firstName} {confirmDelete?.lastName}"? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default Staff
