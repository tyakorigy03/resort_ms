import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
import { saveMyShift, loadMyShift, clearMyShift } from './myShift'
import { useThemeMode } from './ThemeModeProvider'
import ClockInDialog from './components/ClockInDialog'
import SalePeriodDialog from './components/SalePeriodDialog'

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

  // After a clock-out the main app becomes locked again: drop the operator at
  // the clock-in page.
  const prevShiftRef = useRef(myShift)
  useEffect(() => {
    if (prevShiftRef.current && !myShift) navigate('/clock')
    prevShiftRef.current = myShift
  }, [myShift, navigate])

  useEffect(() => {
    if (myShift) saveMyShift(myShift)
    else clearMyShift()
  }, [myShift])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        const [currentPeriod, activeShifts, orders] = await Promise.all([
          api.salePeriodCurrent(),
          api.clockActive(),
          api.ordersToday(),
        ])
        if (ignore) return
        setPeriod(currentPeriod)
        setToday({
          count: orders.length,
          total: orders.reduce((s, o) => s + o.total, 0),
        })
        if (myShift && !activeShifts.some((s) => s.id === myShift.id)) {
          setMyShift(null)
          clearMyShift()
        }
      } catch {
        /* shell keeps working; screens surface errors */
      }
    }
    run()
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => { ignore = true; clearInterval(timer) }
  }, [])

  function logout() {
    clearSession()
    clearMyShift()
    onLogout()
  }

  const refresh = useCallback(async () => {
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
      setMyShift((prev) => {
        if (prev && !activeShifts.some((s) => s.id === prev.id)) {
          clearMyShift()
          return null
        }
        return prev
      })
    } catch {
      /* shell keeps working; screens surface errors */
    }
  }, [])

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
    [device, period, myShift, today, refresh],
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
            <IconButton color="inherit" size="small" onClick={() => setDialog('staff')} title="Clock in / out">
              <AccessTimeIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>

        <BottomNavigation
          showLabels
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
          device={device}
          onChanged={(event) => {
            refresh()
            if (event?.id && !event.clockedOutAt) setMyShift(event)
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
