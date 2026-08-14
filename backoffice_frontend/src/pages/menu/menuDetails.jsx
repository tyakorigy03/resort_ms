import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  IconButton,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import { deleteMenu, getMenu, setMenuActive } from '../../api/menus'
import MenuDialog from '../../components/MenuDialog'
import { useToast } from '../../components/Toast'

function fmt(value) {
  return value === null || value === undefined ? '—' : `$${Number(value).toFixed(2)}`
}

function MenuDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tabIndex, setTabIndex] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function load() {
    const full = await getMenu(id)
    setMenu(full)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    getMenu(id)
      .then((full) => {
        if (active) setMenu(full)
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
  }, [id])

  async function handleToggle() {
    try {
      await setMenuActive(menu.id, !menu.isActive)
      showToast(menu.isActive ? 'Menu deactivated' : 'Menu activated')
      await load()
    } catch (err) {
      showToast(err.message || 'Failed to update menu', 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteMenu(menu.id)
      showToast('Menu deleted')
      navigate('/menu/menu-management')
    } catch (err) {
      showToast(err.message || 'Failed to delete menu', 'error')
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>Loading...</CardContent>
      </Card>
    )
  }

  if (loadError || !menu) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ color: 'error.main', fontSize: '0.78rem' }}>
            {loadError || 'Menu not found'}
          </Typography>
          <Button size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={() => navigate('/menu/menu-management')}>
            Back to menus
          </Button>
        </CardContent>
      </Card>
    )
  }

  const validTab = menu.screens.length ? Math.min(tabIndex, menu.screens.length - 1) : 0

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <IconButton size="small" onClick={() => navigate('/menu/menu-management')} title="Back">
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RestaurantMenuIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {menu.name}
                </Typography>
                <Chip
                  label={menu.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  color={menu.isActive ? 'success' : 'default'}
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              </Box>
              {menu.description && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {menu.description}
                </Typography>
              )}
            </Box>
            <Switch size="small" checked={menu.isActive} onChange={handleToggle} title="Toggle active" />
            <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <IconButton size="small" title="Delete" onClick={() => setConfirmDelete(true)}>
              <DeleteOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>

          {menu.screens.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem', textAlign: 'center', py: 4 }}>
              This menu has no screens yet. Click Edit to add screens and items.
            </Typography>
          ) : (
            <>
              <Tabs
                value={validTab}
                onChange={(_, v) => setTabIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 36,
                  mb: 1,
                  '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', textTransform: 'none', px: 2 },
                }}
              >
                {menu.screens.map((screen) => (
                  <Tab
                    key={screen.id}
                    label={`${screen.name} (${screen.items.length})`}
                  />
                ))}
              </Tabs>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {menu.screens[validTab].items.map((item) => (
                  <Box
                    key={item.itemId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.8,
                      px: 1.5,
                      fontSize: '0.78rem',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <RestaurantMenuIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                      <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 500 }}>
                        {item.itemName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.unit && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                          per {item.unit}
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{fmt(item.itemPrice)}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {editOpen && (
        <MenuDialog
          key={`menu-${menu.id}`}
          open
          initial={menu}
          onSaved={load}
          onClose={() => setEditOpen(false)}
        />
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        slotProps={{ paper: { sx: { borderRadius: 2, width: 340, maxWidth: 340 } } }}
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Delete menu
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
            Delete "{menu.name}"? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" sx={{ color: 'text.secondary', bgcolor: '#f3f4f6' }} onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default MenuDetails
