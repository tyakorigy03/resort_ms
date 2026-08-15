import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Switch,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TuneIcon from '@mui/icons-material/Tune'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import BarChartIcon from '@mui/icons-material/BarChart'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import PrintIcon from '@mui/icons-material/Print'
import FactoryIcon from '@mui/icons-material/Factory'
import DeviceHubIcon from '@mui/icons-material/DeviceHub'
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings'
import TvIcon from '@mui/icons-material/Tv'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import StorefrontIcon from '@mui/icons-material/Storefront'
import LockIcon from '@mui/icons-material/Lock'
import { api } from './api'
import { useShell } from './PosShell'
import { useThemeMode } from './ThemeModeProvider'
import { money } from './format'

const SIDEBAR = [
  { id: 'control', label: 'Control Center', icon: TuneIcon },
  { id: 'notifications', label: 'Notifications', icon: NotificationsIcon },
  { id: 'drawers', label: 'Cash Drawers', icon: PointOfSaleIcon },
  { id: 'reports', label: 'Reports', icon: BarChartIcon },
  { id: 'payments', label: 'Payments', icon: CreditCardIcon },
  { id: 'printing', label: 'Printing Center', icon: PrintIcon },
  { id: 'centers', label: 'Production Centers', icon: FactoryIcon },
  { id: 'sharing', label: 'Device Sharing', icon: DeviceHubIcon },
  { id: 'display', label: 'Display Settings', icon: DisplaySettingsIcon },
  { id: 'kds', label: 'Kitchen Display System', icon: TvIcon },
  { id: 'support', label: 'Support', icon: SupportAgentIcon },
  { id: 'help', label: 'Help Center', icon: HelpOutlineOutlinedIcon },
  { id: 'whatsnew', label: "What's New", icon: NewReleasesIcon },
]

const DEFAULT_NOTIFS = {
  newOrders: true,
  orderFired: true,
  shiftStart: false,
  drawer: false,
}

function loadNotifs() {
  try {
    return { ...DEFAULT_NOTIFS, ...JSON.parse(localStorage.getItem('pos_notif_prefs') || '{}') }
  } catch {
    return { ...DEFAULT_NOTIFS }
  }
}

// Spec 3.7: two-pane settings hub. The left sidebar lists the sections; the
// right pane shows the selected section's content. All theming comes from the
// app's existing theme tokens so dark/light mode is preserved automatically.
export default function SettingsScreen() {
  const { device, period, myShift, today, openClock, openPeriod, logout } = useShell()
  const { mode, toggleMode } = useThemeMode()
  const [section, setSection] = useState('control')
  const [notifs, setNotifs] = useState(loadNotifs)
  const [drawerMsg, setDrawerMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drawer, setDrawer] = useState(null)
  const [dayOrders, setDayOrders] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .drawerToday(device?.id)
      .then(setDrawer)
      .catch(() => setDrawer(null))
    api
      .posOrders({ date: 'today' })
      .then(setDayOrders)
      .catch((err) => setError(err.message))
  }, [device?.id])

  function toggleNotif(key) {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('pos_notif_prefs', JSON.stringify(next))
      return next
    })
  }

  async function openDrawer() {
    if (busy) return
    setBusy(true)
    setDrawerMsg(null)
    try {
      await api.drawerOpen()
      setDrawerMsg({ severity: 'success', text: 'Drawer opened (No sale).' })
    } catch (err) {
      setDrawerMsg({ severity: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
      <Paper
        variant="outlined"
        sx={{
          width: 224,
          minWidth: 224,
          borderRadius: 0,
          borderWidth: '0 1px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          py: 1,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 2, pb: 0.5, color: 'text.secondary' }}>
          Settings
        </Typography>
        {SIDEBAR.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <Button
              key={item.id}
              fullWidth
              color="inherit"
              onClick={() => setSection(item.id)}
              startIcon={<Icon />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                px: 2,
                py: 0.75,
                borderRadius: 0,
                fontSize: '0.875rem',
                bgcolor: active ? 'action.selected' : 'transparent',
                color: active ? 'text.primary' : 'text.secondary',
                fontWeight: active ? 700 : 500,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {item.label}
            </Button>
          )
        })}
      </Paper>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
        {section === 'control' && (
          <ControlCenter
            device={device}
            period={period}
            myShift={myShift}
            today={today}
            openClock={openClock}
            openPeriod={openPeriod}
            logout={logout}
            busy={busy}
            openDrawer={openDrawer}
            drawerMsg={drawerMsg}
            onCloseMsg={() => setDrawerMsg(null)}
          />
        )}
        {section === 'notifications' && <Notifications notifs={notifs} onToggle={toggleNotif} />}
        {section === 'drawers' && <CashDrawers device={device} drawer={drawer} busy={busy} openDrawer={openDrawer} drawerMsg={drawerMsg} onCloseMsg={() => setDrawerMsg(null)} />}
        {section === 'reports' && <Reports orders={dayOrders} />}
        {section === 'payments' && <Payments orders={dayOrders} />}
        {section === 'printing' && <Printing />}
        {section === 'centers' && <ProductionCenters device={device} />}
        {section === 'sharing' && <Sharing device={device} />}
        {section === 'display' && <DisplaySettings mode={mode} toggleMode={toggleMode} />}
        {section === 'kds' && <KdsSection />}
        {section === 'support' && <Support />}
        {section === 'help' && <HelpCenter />}
        {section === 'whatsnew' && <WhatsNew />}
      </Box>
    </Box>
  )
}

function ControlCenter({ device, period, myShift, today, openClock, openPeriod, logout, busy, openDrawer, drawerMsg, onCloseMsg }) {
  return (
    <>
      {drawerMsg && (
        <Alert
          severity={drawerMsg.severity}
          sx={{ fontSize: '0.85rem' }}
          action={
            <IconButton size="small" onClick={onCloseMsg}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {drawerMsg.text}
        </Alert>
      )}
      <Card title="This device">
        <Row label="Name" value={device?.name} />
        <Row label="Code" value={device?.code} />
        <Row label="Type" value={device?.deviceType} />
        <Row label="Outlet" value={device?.outletName} />
        <Row label="Production center" value={device?.productionCenterName} />
      </Card>
      <Card title="Today at this outlet">
        <Row label="Sales period" value={period ? `Open since ${fmt(period.openedAt)}` : 'Closed'} />
        <Row label="My shift" value={myShift ? `${myShift.staffName} (clocked in)` : 'Not clocked in'} />
        <Row label="Orders" value={`${today.count}`} />
        <Row label="Sales total" value={money(today.total)} />
      </Card>
      <Card title="Actions">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button variant="outlined" color="inherit" startIcon={<PointOfSaleIcon />} onClick={openDrawer} disabled={busy} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
            Open drawer (No sale)
          </Button>
          <Button variant="outlined" color="inherit" startIcon={<AccessTimeIcon />} onClick={openClock} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
            Staff clock in / out
          </Button>
          <Button variant="outlined" color="inherit" startIcon={<StorefrontIcon />} onClick={openPeriod} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
            Sales period
          </Button>
        </Box>
      </Card>
      <Button variant="contained" color="warning" startIcon={<LockIcon />} onClick={logout} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
        Lock this register
      </Button>
    </>
  )
}

function Notifications({ notifs, onToggle }) {
  const rows = [
    ['newOrders', 'New orders'],
    ['orderFired', 'Order fired to the kitchen'],
    ['shiftStart', 'Shift start / end'],
    ['drawer', 'Cash drawer opened'],
  ]
  return (
    <Card title="Notifications">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Choose which events this register alerts you about. Preferences are stored on this device.
      </Typography>
      <Divider sx={{ my: 1 }} />
      {rows.map(([key, label]) => (
        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
          <Typography variant="body2">{label}</Typography>
          <Switch size="small" checked={Boolean(notifs[key])} onChange={() => onToggle(key)} />
        </Box>
      ))}
    </Card>
  )
}

function CashDrawers({ device, drawer, busy, openDrawer, drawerMsg, onCloseMsg }) {
  return (
    <>
      {drawerMsg && (
        <Alert
          severity={drawerMsg.severity}
          sx={{ fontSize: '0.85rem' }}
          action={
            <IconButton size="small" onClick={onCloseMsg}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {drawerMsg.text}
        </Alert>
      )}
      <Card title="Cash drawers">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Cash drawers are attached to registers. This drawer ({device?.name}) must be counted before the first shift each day.
        </Typography>
        <Divider sx={{ my: 1 }} />
        {drawer?.hasCountToday ? (
          <>
            <Row label="Count date" value={drawer.count?.countDate} />
            <Row label="Opening count" value={money(drawer.count?.openingCount)} />
            <Row label="Counted by" value={drawer.count?.staffName} />
            <Row label="Confirmed at" value={fmt(drawer.count?.confirmedAt)} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No cash count recorded for today yet. The register will prompt on the next shift start.
          </Typography>
        )}
        <Button variant="outlined" color="inherit" startIcon={<PointOfSaleIcon />} onClick={openDrawer} disabled={busy} sx={{ justifyContent: 'flex-start', textTransform: 'none', mt: 1.5 }}>
          Open drawer (No sale)
        </Button>
      </Card>
    </>
  )
}

function Reports({ orders }) {
  const paid = orders.filter((o) => o.status === 'paid')
  const sales = paid.reduce((s, o) => s + o.total, 0)
  const tips = paid.reduce((s, o) => s + (o.tip || 0), 0)
  return (
    <>
      <StatGrid
        stats={[
          ['Orders', `${orders.length}`],
          ['Paid', `${paid.length}`],
          ['Sales', money(sales)],
          ['Tips', money(tips)],
        ]}
      />
      <Card title="Today's orders">
        <Row label="Open" value={`${orders.filter((o) => o.status === 'open').length}`} />
        <Row label="Paid" value={`${paid.length}`} />
        <Row label="Voided" value={`${orders.filter((o) => o.status === 'void').length}`} />
        <Row label="Gross sales" value={money(sales)} />
      </Card>
    </>
  )
}

function Payments({ orders }) {
  const byMethod = {}
  for (const o of orders) {
    if (o.status !== 'paid') continue
    const m = o.paymentMethod || 'other'
    byMethod[m] = (byMethod[m] || 0) + o.total
  }
  return (
    <>
      <StatGrid
        stats={[
          ['Cash', money(byMethod.cash || 0)],
          ['Card', money(byMethod.card || 0)],
          ['Other', money(byMethod.other || 0)],
          ['Paid orders', `${orders.filter((o) => o.status === 'paid').length}`],
        ]}
      />
      <Card title="Payment breakdown">
        {Object.keys(byMethod).length === 0 && (
          <Typography variant="body2" color="text.secondary">No payments recorded today.</Typography>
        )}
        {Object.entries(byMethod).map(([m, total]) => (
          <Row key={m} label={m === 'other' ? 'Other' : m} value={money(total)} />
        ))}
      </Card>
    </>
  )
}

function Printing() {
  return (
    <Card title="Printing Center">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Receipts and kitchen tickets print through the printers configured for this register.
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Row label="Receipt printer" value="Not set" />
      <Row label="Kitchen printer" value="Uses the Kitchen Display System" />
      <Row label="Duplicate receipts" value="Off" />
    </Card>
  )
}

function ProductionCenters({ device }) {
  return (
    <Card title="Production centers">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        This register routes fired items to its production center.
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Row label="This device" value={device?.name} />
      <Row label="Production center" value={device?.productionCenterName} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Open orders follow the item's kitchen station when fired.
      </Typography>
    </Card>
  )
}

function Sharing({ device }) {
  return (
    <Card title="Device sharing">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Pair other registers to this outlet by entering the device code.
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Row label="Device" value={device?.name} />
      <Row label="Code" value={device?.code} />
      <Row label="Outlet" value={device?.outletName} />
    </Card>
  )
}

function DisplaySettings({ mode, toggleMode }) {
  return (
    <Card title="Display settings">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Theme changes apply immediately and follow this device.
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
        <Typography variant="body2">Dark mode</Typography>
        <Switch size="small" checked={mode === 'dark'} onChange={toggleMode} />
      </Box>
      <Row label="Language" value="English" />
      <Row label="Timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || '—'} />
    </Card>
  )
}

function KdsSection() {
  const [stations, setStations] = useState(null)
  useEffect(() => {
    fetch('http://localhost:5174/api/kds/board')
      .then((r) => r.json().catch(() => null))
      .then((data) => setStations(data && data.stations ? data.stations.length : null))
      .catch(() => setStations(null))
  }, [])
  return (
    <Card title="Kitchen Display System">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        The KDS shows fired orders per kitchen station. It runs on its own display.
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Row label="Stations visible" value={stations === null ? '—' : `${stations}`} />
      <Row label="Device code" value="Enter your KDS code to pair the screen" />
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<TvIcon />}
        onClick={() => window.open('http://localhost:5174', '_blank')}
        sx={{ justifyContent: 'flex-start', textTransform: 'none', mt: 1.5 }}
      >
        Open KDS board
      </Button>
    </Card>
  )
}

function Support() {
  return (
    <Card title="Support">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Need help with this register?
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Row label="Phone" value="+250 700 000 000" />
      <Row label="Email" value="support@resort.example" />
      <Row label="Hours" value="8:00 – 18:00" />
    </Card>
  )
}

function HelpCenter() {
  return (
    <Card title="Help Center">
      <Typography variant="body2" color="text.secondary">
        Guides for everyday tasks:
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Row label="Seat a table and add items" value="Register guide" />
      <Row label="Fire courses to the kitchen" value="Register guide" />
      <Row label="Open and close the sales period" value="Control Center" />
      <Row label="Count the cash drawer" value="Cash Drawers" />
    </Card>
  )
}

function WhatsNew() {
  const items = [
    'Settings hub with dedicated sections for registers, payments and printing.',
    'Cash drawer count is required once per day before the first shift.',
    'Course statuses can be held from the register (On hold).',
  ]
  return (
    <Card title="What's New">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Recent updates on this device:
      </Typography>
      <Divider sx={{ my: 1 }} />
      {items.map((t, i) => (
        <Typography key={i} variant="body2" sx={{ py: 0.75 }}>
          • {t}
        </Typography>
      ))}
    </Card>
  )
}

function StatGrid({ stats }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1 }}>
      {stats.map(([label, value]) => (
        <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
        </Paper>
      ))}
    </Box>
  )
}

function Card({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  )
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

function fmt(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
