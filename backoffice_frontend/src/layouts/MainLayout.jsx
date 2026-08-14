import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SettingsIcon from '@mui/icons-material/Settings'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import InventoryIcon from '@mui/icons-material/Inventory'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import PeopleIcon from '@mui/icons-material/People'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import StorefrontIcon from '@mui/icons-material/Storefront'
import NumbersIcon from '@mui/icons-material/Numbers'
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ScienceIcon from '@mui/icons-material/Science'
import HotelIcon from '@mui/icons-material/Hotel'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import KingBedIcon from '@mui/icons-material/KingBed'
import SellIcon from '@mui/icons-material/Sell'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import BadgeIcon from '@mui/icons-material/Badge'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import GroupIcon from '@mui/icons-material/Group'
import EngineeringIcon from '@mui/icons-material/Engineering'
import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 240
const SIDEBAR_BG = '#1C2333' // matches the dark navy panel in the reference design

// Root items with a non-empty `children` array drill into a panel; within that
// panel the children render as an inline tree (Collapse), so sub-sub levels
// expand in place. Items with an empty/absent `children` array are leaves that
// navigate. Fill in the arrays below as real sections appear.
const navConfig = [
  { label: 'Dashboard', icon: <SpaceDashboardIcon />, path: '/dashboard' },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  {
    label: 'Configuration',
    icon: <SettingsIcon />,
    path: '/configuration',
    children: [
      { label: 'Outlets', icon: <StorefrontIcon />, path: '/configuration/outlets' },
      { label: 'Tax Profiles', icon: <ReceiptLongIcon />, path: '/configuration/tax-profiles' },
      { label: 'Production Centers', icon: <ScienceIcon />, path: '/configuration/production-centers' },
    ],
  },
  {
    label: 'Inventory',
    icon: <Inventory2Icon />,
    path: '/inventory',
    children: [
      {
        label: 'Inventory',
        icon: <StorefrontIcon />,
        path: '/inventory/inventory',
        children: [],
      },
      {
        label: 'Stock Management',
        icon: <StackedBarChartIcon />,
        path: '/inventory/stock-management',
        children: [
          { label: 'Items', path: '/inventory/inventory/items' },
          { label: 'Stock Counts',path: '/inventory/inventory/stock-counts' },
          { label: 'Stock Levels', path: '/inventory/inventory/stock-levels' },
          { label: 'Stock Locations',path: '/inventory/inventory/stock-locations' },
          { label: 'Wastage', path: '/inventory/inventory/wastage' },
        ],
      },
      {
        label: 'Purchases',
        icon: <ShoppingCartIcon />,
        path: '/inventory/purchases',
        children: [
          { label: 'Purchase Orders',path: '/inventory/purchases/purchase-orders' },
          { label: 'Suppliers',  path: '/inventory/purchases/suppliers' },
          { label: 'Reports', path: '/inventory/purchases/reports' },
        ],
      },
      {
        label: 'Produce',
        icon: <AgricultureIcon />,
        path: '/inventory/produce',
        children: [
          { label: 'Recipes',path: '/inventory/produce/recipes' },
          { label: 'Batches', path: '/inventory/produce/batches' },
          { label: 'Batch History', path: '/inventory/produce/batch-history' },
        ],
      },
    ],
  },
  {
    label: 'Menu',
    icon: <RestaurantMenuIcon />,
    path: '/menu',
    children: [
      { label: 'Items List', icon: <InventoryIcon />, path: '/menu/items-list' },
      { label: 'Menu Management', icon: <MenuBookIcon />, path: '/menu/menu-management' },
      // { label: 'Production Instructions', icon: <ScienceIcon />, path: '/menu/production-instructions' },
      { label: 'Accounting Groups', icon: <ReceiptLongIcon />, path: '/menu/accounting-groups' },
      { label: 'Price Lists', icon: <NumbersIcon />, path: '/menu/price-lists' },
    ],
  },
  {
    label: 'Rooms',
    icon: <HotelIcon />,
    path: '/rooms',
    children: [
      { label: 'Rooms', icon: <MeetingRoomIcon />, path: '/rooms/rooms' },
      { label: 'Room Types', icon: <KingBedIcon />, path: '/rooms/room-types' },
      { label: 'Rate Plans', icon: <SellIcon />, path: '/rooms/rate-plans' },
    ],
  },
  {
    label: 'Housekeeping',
    icon: <CleaningServicesIcon />,
    path: '/housekeeping',
    children: [
      { label: 'Rooms Status', icon: <BadgeIcon />, path: '/housekeeping/room-status' },
      { label: 'Task Assignment', icon: <ChecklistRtlIcon />, path: '/housekeeping/tasks' },
    ],
  },
  { label: 'Customers', icon: <GroupIcon />, path: '/customers' },
  { label: 'Staff', icon: <EngineeringIcon />, path: '/staff' },
  { label: 'Devices', icon: <DevicesOtherIcon />, path: '/devices' },
  { label: 'Users', icon: <PeopleIcon />, path: '/users' },
]

function findLabelForPath(items, pathname) {
  for (const item of items) {
    if (item.path === pathname) return item.label
    if (item.children && item.children.length > 0) {
      const found = findLabelForPath(item.children, pathname)
      if (found) return found
    }
  }
  return null
}

function findStackForPath(items, pathname, stack = []) {
  for (const item of items) {
    if (item.path === pathname) return stack
    if (item.children && item.children.length > 0) {
      const found = findStackForPath(item.children, pathname, [...stack, item])
      if (found) return found
    }
  }
  return null
}

function TreeItem({ item, depth = 0, onLeafClick }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const hasChildren = item.children && item.children.length > 0

  function handleClick() {
    if (hasChildren) {
      setExpanded((v) => !v)
    } else {
      if (item.path) navigate(item.path)
      onLeafClick()
    }
  }

  return (
    <Box>
      <ListItem disablePadding>
        <ListItemButton
          selected={pathname === item.path}
          onClick={handleClick}
          sx={{
            mx: 1,
            borderRadius: 1,
            color: pathname === item.path ? 'primary.main' : '#fff',
            pl: item.children && item.children.length > 0 ? 1 : 4,
            py: 0.5,
            fontWeight: pathname === item.path ? 600 : 400,
            transition: 'background-color 0.2s ease',
            '&.Mui-selected': { bgcolor: 'transparent' },
            '&.Mui-selected:hover': { bgcolor: 'transparent' },
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          {hasChildren && (
            <ArrowRightIcon
              fontSize="small"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                mr: 0.5,
              }}
            />
          )}
          {item.icon && (
            <ListItemIcon
              sx={{ color: 'inherit', minWidth: 32, '& .MuiSvgIcon-root': { fontSize: 18 } }}
            >
              {item.icon}
            </ListItemIcon>
          )}
          <ListItemText
            primary={item.label}
            sx={{ minWidth: 0 }}
            slotProps={{
              primary: {
                noWrap: true,
                sx: {
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: pathname === item.path ? 600 : 400,
                },
              },
            }}
          />
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List  sx={{ml:2.5}} component="div" disablePadding>
            {item.children.map((child) => (
              <TreeItem
                key={child.path ?? child.label}
                item={child}
                depth={depth + 1}
                onLeafClick={onLeafClick}
              />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  )
}

function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  // Stack of parent items the user has drilled into. Empty = showing the top-level nav.
  const [navStack, setNavStack] = useState([])


  useEffect(() => {
    setNavStack(findStackForPath(navConfig, pathname) ?? [])
  }, [pathname])

  const atRoot = navStack.length === 0
  const currentParent = atRoot ? null : navStack[navStack.length - 1]

  function handleItemClick(item) {
    if (item.children && item.children.length > 0) {
      setNavStack((prev) => [...prev, item])
    } else {
      if (item.path) navigate(item.path)
      if (isMobile) setMobileOpen(false)
    }
  }

  function handleBack() {
    setNavStack((prev) => prev.slice(0, -1))
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const appBarTitle = findLabelForPath(navConfig, pathname) ?? currentParent?.label ?? 'Resort Manager'

  const drawerContent = (
    <Box sx={{ bgcolor: SIDEBAR_BG, color: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header: brand always persists */}
      <Toolbar sx={{ gap: 1 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
          Resort Manager
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      {
        !atRoot && <>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5 }}>
           <IconButton edge="start" size='small' onClick={handleBack} aria-label="back" sx={{ mr: 1, color: '#fff' }}>
             <ArrowBackIcon fontSize='12' />
           </IconButton>
           <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
             {appBarTitle}
           </Typography>
         </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      </>
      }

      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        {atRoot ? (
          <List sx={{ py: 0 }}>
            {navConfig.map((item) => (
              <ListItem key={item.path ?? item.label} disablePadding>
                <ListItemButton
                  selected={pathname === item.path}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    color: pathname === item.path ? 'primary.main' : '#fff',
                    pl: item.children && item.children.length > 0 ? 0 : 2.4,
                    py: 0.5,
                    fontWeight: pathname === item.path ? 600 : 400,
                    '&.Mui-selected': { bgcolor: 'transparent' },
                    '&.Mui-selected:hover': { bgcolor: 'transparent' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  {item.children && item.children.length > 0 && (
                    <ArrowRightIcon
                      fontSize="small"
                      sx={{ color: 'rgba(255,255,255,0.5)', mr: 0 }}
                    />
                  )}
                  {item.icon && (
                    <ListItemIcon
                      sx={{ color: 'inherit', minWidth: 32, '& .MuiSvgIcon-root': { fontSize: 18 } }}
                    >
                      {item.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                    primary: {
                      noWrap: true,
                      sx: {
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: pathname === item.path ? 600 : 400,
                      },
                    },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          (currentParent.children?.length ?? 0) > 0 ? (
            <List sx={{ py: 0 }}>
              {currentParent.children.map((item) => (
                <TreeItem
                  key={item.path ?? item.label}
                  item={item}
                  depth={0}
                  onLeafClick={() => isMobile && setMobileOpen(false)}
                />
              ))}
            </List>
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', px: 3, py: 2 }}>
              No items yet
            </Typography>
          )
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {/* Account footer, styled after the reference: account block + utility icon row */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          <StorefrontIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
            {user?.accountName ?? 'Resort Manager - Test Account'}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
            {user?.email}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          py: 1,
        }}
      >
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} aria-label="help">
          <HelpOutlineOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} aria-label="notifications">
          <NotificationsNoneIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} aria-label="account" onClick={handleLogout}>
          <AccountCircleIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} aria-label="add store">
          <AddBoxOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100svh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={1}
        sx={{ width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}
      >
        <Toolbar sx={{ minHeight: { xs: 44, sm: 48 }, px: { xs: 1.5, sm: 2 }, gap: 1.5 }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open menu"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, p: 0.5 }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          <Typography variant="subtitle1" noWrap sx={{ flexGrow: 1, fontWeight: 600, fontSize: '0.95rem' }}>
            {appBarTitle}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.78rem' }}>
              {user?.name}
            </Typography>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={isMobile && mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: SIDEBAR_BG },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: SIDEBAR_BG,
              border: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'grey.100', minWidth: 0 }}>
        <Toolbar sx={{ minHeight: { xs: 44, sm: 48 } }} />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default MainLayout
