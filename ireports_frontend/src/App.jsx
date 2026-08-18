import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import Login from './pages/auth/login'
import Dashboard from './pages/reports/Dashboard'
import SalesOverview from './pages/reports/SalesOverview'
import SalesByItem from './pages/reports/SalesByItem'
import SalesByOutlet from './pages/reports/SalesByOutlet'
import SalesByStaff from './pages/reports/SalesByStaff'
import SalesByHour from './pages/reports/SalesByHour'
import StockSummary from './pages/reports/StockSummary'
import WastageReport from './pages/reports/WastageReport'
import StockMovements from './pages/reports/StockMovements'
import OccupancyReport from './pages/reports/OccupancyReport'
import RoomRevenue from './pages/reports/RoomRevenue'
import StaffPerformance from './pages/reports/StaffPerformance'
import MenuPerformance from './pages/reports/MenuPerformance'

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sales" element={<SalesOverview />} />
            <Route path="/sales/by-item" element={<SalesByItem />} />
            <Route path="/sales/by-outlet" element={<SalesByOutlet />} />
            <Route path="/sales/by-staff" element={<SalesByStaff />} />
            <Route path="/sales/hourly" element={<SalesByHour />} />
            <Route path="/inventory/stock-summary" element={<StockSummary />} />
            <Route path="/inventory/wastage" element={<WastageReport />} />
            <Route path="/inventory/movements" element={<StockMovements />} />
            <Route path="/occupancy" element={<OccupancyReport />} />
            <Route path="/occupancy/revenue" element={<RoomRevenue />} />
            <Route path="/staff" element={<StaffPerformance />} />
            <Route path="/menu" element={<MenuPerformance />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
