import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import Login from './pages/auth/login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/inventory/inventory'
import Items from './pages/inventory/items'
import StockCounts from './pages/inventory/stockCounts'
import StockLevels from './pages/inventory/stockLevels'
import StockLocations from './pages/inventory/stockLocations'
import Wastage from './pages/inventory/wastage'
import PurchaseOrders from './pages/inventory/purchases/purchaseOrders'
import PurchaseReports from './pages/inventory/purchases/reports'
import Suppliers from './pages/inventory/purchases/suppliers'
import Recipes from './pages/inventory/produce/recipes'
import Batches from './pages/inventory/produce/batches'
import BatchHistory from './pages/inventory/produce/batchHistory'
import MenuItemsList from './pages/menu/itemsList'
import MenuManagement from './pages/menu/menuManagement'
import MenuDetails from './pages/menu/menuDetails'
import MenuAccountingGroups from './pages/menu/accountingGroups'
import MenuPriceLists from './pages/menu/priceLists'
import Outlets from './pages/configuration/outlets'
import TaxProfiles from './pages/configuration/taxProfiles'
import ProductionCenters from './pages/configuration/productionCenters'
import Devices from './pages/devices/devices'
import Customers from './pages/customers/customers'
import Rooms from './pages/rooms/rooms'
import RoomDetail from './pages/rooms/roomDetail'
import RoomTypes from './pages/rooms/roomTypes'
import RatePlans from './pages/rooms/ratePlans'
import ReservationsView from './pages/rooms/reservations'
import RoomStatus from './pages/housekeeping/roomStatus'
import HousekeepingTasks from './pages/housekeeping/tasks'
import Staff from './pages/staff/staff'
import Users from './pages/Users'
import FloorPlans from './pages/floorPlans/floorPlans'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/floor-plans" element={<FloorPlans />} />
            <Route path="/inventory/inventory" element={<Inventory />} />
            <Route path="/inventory/inventory/items" element={<Items />} />
            <Route path="/inventory/inventory/stock-counts" element={<StockCounts />} />
            <Route path="/inventory/inventory/stock-levels" element={<StockLevels />} />
            <Route path="/inventory/inventory/stock-locations" element={<StockLocations />} />
            <Route path="/inventory/inventory/wastage" element={<Wastage />} />
            <Route path="/inventory/purchases/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/inventory/purchases/reports" element={<PurchaseReports />} />
            <Route path="/inventory/purchases/suppliers" element={<Suppliers />} />
            <Route path="/inventory/produce/recipes" element={<Recipes />} />
            <Route path="/inventory/produce/batches" element={<Batches />} />
            <Route path="/inventory/produce/batch-history" element={<BatchHistory />} />
            <Route path="/menu/items-list" element={<MenuItemsList />} />
            <Route path="/menu/menu-management" element={<MenuManagement />} />
            <Route path="/menu/menu-management/:id" element={<MenuDetails />} />
            <Route path="/menu/accounting-groups" element={<MenuAccountingGroups />} />
            <Route path="/menu/price-lists" element={<MenuPriceLists />} />
            <Route path="/configuration/outlets" element={<Outlets />} />
            <Route path="/configuration/tax-profiles" element={<TaxProfiles />} />
            <Route path="/configuration/production-centers" element={<ProductionCenters />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/rooms/rooms" element={<Rooms />} />
            <Route path="/rooms/rooms/:id" element={<RoomDetail />} />
            <Route path="/rooms/room-types" element={<RoomTypes />} />
            <Route path="/rooms/rate-plans" element={<RatePlans />} />
            <Route path="/rooms/reservations" element={<ReservationsView />} />
            <Route path="/housekeeping/room-status" element={<RoomStatus />} />
            <Route path="/housekeeping/tasks" element={<HousekeepingTasks />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
