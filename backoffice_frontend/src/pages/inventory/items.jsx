import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search'
import { createItem, getItem, listItems, updateItem } from '../../api/items'
import { listSuppliers } from '../../api/suppliers'
import { useToast } from '../../components/Toast'
import ItemDetailDialog from '../../components/ItemDetailDialog'

function Items() {
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

  function closeDetails() {
    navigate('/inventory/inventory/items')
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
          <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setAddOpen(true)}>
            New Item
          </Button>
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
            minWidth: 300,
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
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell>Loading...</TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  onClick={() => navigate(`/inventory/inventory/items?view_details=${item.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{item.name}</TableCell>
                </TableRow>
              ))
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell>No items found.</TableCell>
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
    </Card>
  )
}

export default Items
