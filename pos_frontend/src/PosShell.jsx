import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import StorefrontIcon from '@mui/icons-material/Storefront'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import GroupsIcon from '@mui/icons-material/Groups'
import ReceiptIcon from '@mui/icons-material/Receipt'
import SettingsIcon from '@mui/icons-material/Settings'
import { api, clearSession } from './api'
import { money } from './format'
import { useThemeMode } from './ThemeModeProvider'
import ClockInDialog from './components/ClockInDialog'
import SalePeriodDialog from './components/SalePeriodDialog'

const MY_SHIFT_KEY = 'pos_my_shift'

function loadMyShift() {
  try {
    return JSON.parse(localStorage.getItem(MY_SHIFT_KEY) || 'null')
  } catch {
    return null
  }
}

const ShellContext = createContext(null)

export function useShell() {
  return useContext(ShellContext)
}

const NAV = [
  { label: 'Register', path: '/register', icon: <StorefrontIcon /> },
  { label: 'Tables', path: '/tables', icon: <TableRestaurantIcon /> },
  { label: 'Orders', path: '/orders', icon: <ReceiptLongIcon /> },
  { label: 'Customers', path: '/customers', icon: <GroupsIcon /> },
  { label: 'Receipts', path: '/receipts', icon: <ReceiptIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
]

export default function PosShell({ device, onLogout, children }) {
  const [period, setPeriod] = useState(null)
  const [today, setToday] = useState({ count: 0, total: 0 })
  const [myShift, setMyShift] = useState(loadMyShift)
  const [clock, setClock] = useState(new Date())
  const [dialog, setDialog] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, toggleMode } = useThemeMode()

  async function refresh() {
    try {
      const [currentPeriod, activeShifts, orders] = await Promise.all([
        api.salePeriodCurrent(),
        api.clockActive(),
        api.ordersToday(),
      ])
      setPeriod(currentPeriod)
      setToday({
        count: orders.length,
        total: orders.reduce((s, o) => s + o.total, 0),
      })
      if (myShift && !activeShifts.some((s) => s.id === myShift.id)) {
        setMyShift(null)
        localStorage.removeItem(MY_SHIFT_KEY)
      }
    } catch {
      /* shell keeps working; screens surface errors */
    }
  }

  useEffect(() => {
    localStorage.setItem(MY_SHIFT_KEY, JSON.stringify(myShift))
  }, [myShift])

  useEffect(() => {
    refresh()
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function logout() {
    clearSession()
    localStorage.removeItem(MY_SHIFT_KEY)
    onLogout()
  }

  const value = useMemo(
    () => ({
      device,
      period,
      myShift,
      setMyShift,
      today,
      refresh,
      logout,
      openClock: () => setDialog('staff'),
      openPeriod: () => setDialog('period'),
    }),
    [device, period, myShift, today],
  )

  const currentTab = NAV.find((n) => location.pathname.startsWith(n.path))?.path || '/register'

  return (
    <ShellContext.Provider value={value}>
      <Box sx={{ height: '100svh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: 'topBar' }}>
          <Toolbar sx={{ gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 38, height: 38 }}>
                <RestaurantIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ lineHeight: 1.2, fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {device?.name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.2, display: 'block' }}>
                  {device?.outletName || 'Restaurant'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
              label={period ? `Open since ${fmtTime(period.openedAt)}` : 'Sales period closed'}
              color={period ? 'success' : 'error'}
              size="small"
              clickable
              onClick={() => setDialog('period')}
            />
            <Chip
              icon={<PersonIcon sx={{ fontSize: 16 }} />}
              label={myShift ? `Serving: ${myShift.staffName}` : 'No cashier clocked in'}
              color={myShift ? 'success' : 'default'}
              size="small"
              clickable
              onClick={() => setDialog('staff')}
            />

            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, lineHeight: 1.2 }}>
                Today
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {today.count} orders · {money(today.total)}
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 58, textAlign: 'right' }}>
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>

            <IconButton color="inherit" size="small" onClick={toggleMode} title="Toggle theme">
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
            <IconButton color="inherit" size="small" onClick={logout} title="Lock">
              <LockIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>

        <BottomNavigation
          value={currentTab}
          onChange={(_, v) => navigate(v)}
          sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'topBar' }}
        >
          {NAV.map((n) => (
            <BottomNavigationAction key={n.path} label={n.label} value={n.path} icon={n.icon} />
          ))}
        </BottomNavigation>

        <ClockInDialog
          open={dialog === 'staff'}
          onClose={() => setDialog(null)}
          onChanged={() => {
            refresh()
            setMyShift(loadMyShift())
          }}
        />
        <SalePeriodDialog
          open={dialog === 'period'}
          onClose={() => setDialog(null)}
          period={period}
          onChanged={refresh}
        />
      </Box>
    </ShellContext.Provider>
  )
}

function fmtTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
