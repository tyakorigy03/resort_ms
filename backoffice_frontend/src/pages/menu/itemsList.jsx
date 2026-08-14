import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import SearchIcon from '@mui/icons-material/Search'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import { createItem, getItem, listItems, updateItem } from '../../api/items'
import { listSuppliers } from '../../api/suppliers'
import { useToast } from '../../components/Toast'
import ItemDetailDialog from '../../components/ItemDetailDialog'
import {
  ComboDialog,
  ModifierDialog,
  ModifierGroupDialog,
  MultipleItemsDialog,
} from './createDialogs'

function MenuItemsList() {
  const navigate = useNavigate()
  const showToast = useToast()
  const [searchParams] = useSearchParams()
  const detailsId = searchParams.get('view_details')
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [detailsItem, setDetailsItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [multipleOpen, setMultipleOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [modifierOpen, setModifierOpen] = useState(false)
  const [modifierGroupOpen, setModifierGroupOpen] = useState(false)
  const [createAnchor, setCreateAnchor] = useState(null)
  const [order, setOrder] = useState('asc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([listItems(), listSuppliers()])
      .then(([itemRows, supplierRows]) => {
        if (!active) return
        setItems(itemRows)
        setSuppliers(supplierRows)
        setLoadError('')
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
  }, [])

  useEffect(() => {
    if (!detailsId) {
      setDetailsItem(null)
      return
    }
    let active = true
    getItem(detailsId)
      .then((item) => {
        if (active) setDetailsItem(item)
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
    return () => {
      active = false
    }
  }, [detailsId])

  const filtered = items
    .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)))

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  function toggleSort() {
    setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  function handleChangePage(_, newPage) {
    setPage(newPage)
  }

  function handleChangeRowsPerPage(event) {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  function handleSearch(event) {
    setQuery(event.target.value)
    setPage(0)
  }

  function formatPrice(item) {
    const main = item.prices?.find((p) => p.isDefault)
    if (!main) return '—'
    const symbol = main.currency === 'USD' ? '$' : `${main.currency} `
    return `${symbol}${Number(main.price).toFixed(2)}`
  }

  function closeDetails() {
    navigate('/menu/items-list')
  }

  async function refreshItems() {
    const rows = await listItems()
    setItems(rows)
  }

  async function handleCreate(data) {
    await createItem(data)
    setAddOpen(false)
    await refreshItems()
    showToast('Item created')
  }

  async function handleUpdate(data) {
    await updateItem(detailsItem.id, data)
    closeDetails()
    await refreshItems()
    showToast('Item saved')
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search items"
            value={query}
            onChange={handleSearch}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
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
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setCreateAnchor(e.currentTarget)}
          >
            Create
          </Button>
          <Menu
            anchorEl={createAnchor}
            open={!!createAnchor}
            onClose={() => setCreateAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180 } } }}
          >
            <MenuItem
              sx={{ fontSize: '0.75rem' }}
              onClick={() => {
                setCreateAnchor(null)
                setAddOpen(true)
              }}
            >
              Single item
            </MenuItem>
            <MenuItem
              sx={{ fontSize: '0.75rem' }}
              onClick={() => {
                setCreateAnchor(null)
                setMultipleOpen(true)
              }}
            >
              Multiple items
            </MenuItem>
            <MenuItem
              sx={{ fontSize: '0.75rem' }}
              onClick={() => {
                setCreateAnchor(null)
                setComboOpen(true)
              }}
            >
              Combo
            </MenuItem>
            <MenuItem
              sx={{ fontSize: '0.75rem' }}
              onClick={() => {
                setCreateAnchor(null)
                setModifierOpen(true)
              }}
            >
              Modifier
            </MenuItem>
            <MenuItem
              sx={{ fontSize: '0.75rem' }}
              onClick={() => {
                setCreateAnchor(null)
                setModifierGroupOpen(true)
              }}
            >
              Modifier group
            </MenuItem>
          </Menu>
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
            minWidth: 480,
            '& .MuiTableCell-root': { py: 0.55, px: 0.75, fontSize: '0.75rem', lineHeight: 1.3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel active direction={order} onClick={toggleSort}>
                  Item
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Accounting group</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  onClick={() => navigate(`/menu/items-list?view_details=${item.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Avatar
                        variant="rounded"
                        src={item.image || undefined}
                        sx={{ width: 28, height: 28 }}
                      >
                        <RestaurantMenuIcon sx={{ fontSize: 15 }} />
                      </Avatar>
                      <Typography noWrap sx={{ fontSize: '0.75rem' }}>
                        {item.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.sku || '—'}</TableCell>
                  <TableCell>{item.category || '—'}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatPrice(item)}
                  </TableCell>
                  <TableCell>
                    {item.accountingGroup ? (
                      <Chip
                        label={item.accountingGroup}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No items found.</TableCell>
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

      {detailsItem && (
        <ItemDetailDialog
          key={detailsItem.id}
          item={detailsItem}
          suppliers={suppliers}
          onSave={handleUpdate}
          onClose={closeDetails}
        />
      )}
      {addOpen && (
        <ItemDetailDialog
          key="new-item"
          suppliers={suppliers}
          onSave={handleCreate}
          onClose={() => setAddOpen(false)}
        />
      )}
      {multipleOpen && (
        <MultipleItemsDialog
          open
          onClose={() => setMultipleOpen(false)}
          onSaved={refreshItems}
        />
      )}
      {comboOpen && (
        <ComboDialog open onClose={() => setComboOpen(false)} onSaved={refreshItems} />
      )}
      {modifierOpen && (
        <ModifierDialog open onClose={() => setModifierOpen(false)} onSaved={refreshItems} />
      )}
      {modifierGroupOpen && (
        <ModifierGroupDialog open onClose={() => setModifierGroupOpen(false)} onSaved={refreshItems} />
      )}
    </Card>
  )
}

export default MenuItemsList
