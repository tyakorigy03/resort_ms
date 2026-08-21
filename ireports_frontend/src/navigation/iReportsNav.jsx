import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard'
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import StorefrontIcon from '@mui/icons-material/Storefront'
import GroupIcon from '@mui/icons-material/Group'
import ScheduleIcon from '@mui/icons-material/Schedule'
import InventoryIcon from '@mui/icons-material/Inventory'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import HotelIcon from '@mui/icons-material/Hotel'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import BadgeIcon from '@mui/icons-material/Badge'
import MenuBookIcon from '@mui/icons-material/MenuBook'

export const iReportsNav = [
  { id: 'dashboard', label: 'Dashboard', to: '/', icon: <SpaceDashboardIcon /> },
  { divider: true },
  { id: 'sales-caption', label: 'Sales', caption: true },
  { id: 'sales-overview', label: 'Sales Overview', to: '/sales', icon: <TrendingUpIcon />, child: true },
  { id: 'sales-by-item', label: 'By Item', to: '/sales/by-item', icon: <RestaurantMenuIcon />, child: true },
  { id: 'sales-by-outlet', label: 'By Outlet', to: '/sales/by-outlet', icon: <StorefrontIcon />, child: true },
  { id: 'sales-by-staff', label: 'By Staff', to: '/sales/by-staff', icon: <GroupIcon />, child: true },
  { id: 'sales-by-hour', label: 'By Hour', to: '/sales/hourly', icon: <ScheduleIcon />, child: true },
  { divider: true },
  { id: 'inventory-caption', label: 'Inventory', caption: true },
  { id: 'stock-summary', label: 'Stock Summary', to: '/inventory/stock-summary', icon: <InventoryIcon />, child: true },
  { id: 'wastage', label: 'Wastage', to: '/inventory/wastage', icon: <DeleteSweepIcon />, child: true },
  { id: 'movements', label: 'Movements', to: '/inventory/movements', icon: <SwapHorizIcon />, child: true },
  { divider: true },
  { id: 'occupancy-caption', label: 'Occupancy', caption: true },
  { id: 'occupancy-report', label: 'Occupancy Report', to: '/occupancy', icon: <HotelIcon />, child: true },
  { id: 'room-revenue', label: 'Room Revenue', to: '/occupancy/revenue', icon: <PaymentsOutlinedIcon />, child: true },
  { divider: true },
  { id: 'team-caption', label: 'Team & Menu', caption: true },
  { id: 'staff', label: 'Staff', to: '/staff', icon: <BadgeIcon />, child: true },
  { id: 'menu', label: 'Menu', to: '/menu', icon: <MenuBookIcon />, child: true },
]
