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
import PaymentsIcon from '@mui/icons-material/Payments'
import InventoryIcon from '@mui/icons-material/Inventory'
import HotelIcon from '@mui/icons-material/Hotel'
import BadgeIcon from '@mui/icons-material/Badge'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import LogoutIcon from '@mui/icons-material/Logout'
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined'
import StorefrontIcon from '@mui/icons-material/Storefront'
import GroupIcon from '@mui/icons-material/Group'
import ScheduleIcon from '@mui/icons-material/Schedule'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 240
const SIDEBAR_BG = '#1C2333'

const navConfig = [
  { label: 'Dashboard', icon: <SpaceDashboardIcon />, path: '/' },
  {
    label: 'Sales',
    icon: <PaymentsIcon />,
    path: '/sales',
    children: [
      { label: 'Sales Overview', icon: <TrendingUpIcon />, path: '/sales' },
      { label: 'By Item', icon: <RestaurantMenuIcon />, path: '/sales/by-item' },
      { label: 'By Outlet', icon: <StorefrontIcon />, path: '/sales/by-outlet' },
      { label: 'By Staff', icon: <GroupIcon />, path: '/sales/by-staff' },
      { label: 'By Hour', icon: <ScheduleIcon />, path: '/sales/hourly' },
    ],
  },
  {
    label: 'Inventory',
    icon: <InventoryIcon />,
    path: '/inventory',
    children: [
      { label: 'Stock Summary', icon: <InventoryIcon />, path: '/inventory/stock-summary' },
      { label: 'Wastage', icon: <DeleteSweepIcon />, path: '/inventory/wastage' },
      { label: 'Movements', icon: <SwapHorizIcon />, path: '/inventory/movements' },
    ],
  },
  {
    label: 'Occupancy',
    icon: <HotelIcon />,
    path: '/occupancy',
    children: [
      { label: 'Occupancy Report', icon: <HotelIcon />, path: '/occupancy' },
      { label: 'Room Revenue', icon: <PaymentsIcon />, path: '/occupancy/revenue' },
    ],
  },
  { label: 'Staff', icon: <BadgeIcon />, path: '/staff' },
  { label: 'Menu', icon: <RestaurantMenuIcon />, path: '/menu' },
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
          <List sx={{ ml: 2.5 }} component="div" disablePadding>
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
  const [navStack, setNavStack] = useState([])

  useEffect(() => {
    setNavStack(findStackForPath(navConfig, pathname) ?? [])
  }, [pathname])

  const atRoot = navStack.length === 0
  const currentParent = atRoot ? null : navStack[navStack.length - 1]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const appBarTitle = findLabelForPath(navConfig, pathname) ?? currentParent?.label ?? 'iReports'

  const drawerContent = (
    <Box sx={{ bgcolor: SIDEBAR_BG, color: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1 }}>
        <AssessmentIcon sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
          iReports
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {!atRoot && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5 }}>
            <IconButton
              edge="start"
              size="small"
              onClick={() => setNavStack((prev) => prev.slice(0, -1))}
              aria-label="back"
              sx={{ mr: 1, color: '#fff' }}
            >
              <ArrowBackIcon fontSize="12" />
            </IconButton>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
              {appBarTitle}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
        </>
      )}

      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        {atRoot ? (
          <List sx={{ py: 0 }}>
            {navConfig.map((item) => (
              <ListItem key={item.path ?? item.label} disablePadding>
                <ListItemButton
                  selected={pathname === item.path}
                  onClick={() => {
                    if (item.children && item.children.length > 0) {
                      setNavStack((prev) => [...prev, item])
                    } else {
                      if (item.path) navigate(item.path)
                      if (isMobile) setMobileOpen(false)
                    }
                  }}
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
                    <ArrowRightIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)', mr: 0 }} />
                  )}
                  {item.icon && (
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 32, '& .MuiSvgIcon-root': { fontSize: 18 } }}>
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
          (currentParent.children?.length ?? 0) > 0 && (
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
          )
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          <AssessmentIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#fff' }}>
            {user?.name ?? 'iReports User'}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
            {user?.email}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} aria-label="logout" onClick={handleLogout}>
          <LogoutIcon fontSize="small" />
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
