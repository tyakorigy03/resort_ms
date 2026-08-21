import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { api, getGuestSession } from '../api'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
}

export default function Bill() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const session = getGuestSession()

  useEffect(() => {
    if (!session?.reservationId || !session?.verified) {
      navigate('/')
      return
    }
    loadFolio()
  }, [])

  async function loadFolio() {
    try {
      const d = await api.dashboard(session.reservationId)
      setData(d)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const folio = data?.folio
  const total = folio?.lines?.reduce((sum, l) => sum + Number(l.amount || 0), 0) || 0

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Your Bill
      </Typography>

      {folio ? (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Room {data.roomNumber}</Typography>
                <Typography variant="body2" color="text.secondary">Folio #{folio.id}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Total Charges</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatMoney(total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Balance Due</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: folio.balance > 0 ? 'error.main' : 'success.main', fontSize: '1.1rem' }}>
                  {formatMoney(folio.balance)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {folio.lines?.length > 0 ? (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, px: 1 }}>
                  Charges
                </Typography>
                <List disablePadding>
                  {folio.lines.map((line) => (
                    <ListItem key={line.id} disablePadding sx={{ py: 0.75, px: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {line.description}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {line.type?.replace('_', ' ')}
                          </Typography>
                        }
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatMoney(line.amount)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <ReceiptLongIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No charges yet
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No billing information available
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
