import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { deleteMenu, getMenu, listMenus, setMenuActive } from '../../api/menus'
import MenuDialog from '../../components/MenuDialog'
import { useToast } from '../../components/Toast'

function MenuManagement() {
  const navigate = useNavigate()
  const showToast = useToast()
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState({ open: false, menu: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    let active = true
    listMenus()
      .then((rows) => {
        if (active) setMenus(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    setMenus(await listMenus())
  }

  function openEdit(menu) {
    getMenu(menu.id)
      .then((full) => setDialog({ open: true, menu: full }))
      .catch((err) => showToast(err.message || 'Failed to load menu', 'error'))
  }

  async function handleToggle(menu) {
    try {
      await setMenuActive(menu.id, !menu.isActive)
      showToast(menu.isActive ? 'Menu deactivated' : 'Menu activated')
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to update menu', 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteMenu(confirmDelete.id)
      showToast('Menu deleted')
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Failed to delete menu', 'error')
      setConfirmDelete(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Menus
          </Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialog({ open: true, menu: null })}>
            New Menu
          </Button>
        </Box>

        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            minWidth: 480,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '32%' }}>Menu</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Screens</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Items</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : (
              menus.map((menu) => (
                <TableRow
                  key={menu.id}
                  hover
                  onClick={() => navigate(`/menu/menu-management/${menu.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography noWrap sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      {menu.name}
                    </Typography>
                    {menu.description && (
                      <Typography noWrap sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        {menu.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{menu.screenCount}</TableCell>
                  <TableCell align="right">{menu.itemCount}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <Switch size="small" checked={menu.isActive} onChange={() => handleToggle(menu)} />
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: menu.isActive ? 'success.main' : 'text.secondary' }}>
                        {menu.isActive ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'inline-flex' }} onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        title="Edit"
                        onClick={() => openEdit(menu)}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Delete"
                        onClick={() => setConfirmDelete({ id: menu.id, name: menu.name })}
                      >
                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && menus.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No menus yet. Create your first menu.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {dialog.open && (
        <MenuDialog
          key={dialog.menu ? `menu-${dialog.menu.id}` : 'menu-new'}
          open
          initial={dialog.menu}
          onSaved={refresh}
          onClose={() => setDialog({ open: false, menu: null })}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete menu
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{confirmDelete?.name}"? This cannot be undone.
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

export default MenuManagement
