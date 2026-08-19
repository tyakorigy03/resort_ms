import request from './client'

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '')
  return entries.length ? '?' + new URLSearchParams(entries).toString() : ''
}

export function getExecutiveDashboard() {
  return request('/api/reports')
}

export function getRevenueTrend(days) {
  return request(`/api/reports/revenue-trend${qs({ days })}`)
}

export function getSalesDaily(start, end, outletId) {
  return request(`/api/reports/sales/daily${qs({ start, end, outletId })}`)
}

export function getSalesByItem(start, end) {
  return request(`/api/reports/sales/by-item${qs({ start, end })}`)
}

export function getSalesByOutlet(start, end) {
  return request(`/api/reports/sales/by-outlet${qs({ start, end })}`)
}

export function getSalesByStaff(start, end) {
  return request(`/api/reports/sales/by-staff${qs({ start, end })}`)
}

export function getSalesByHour(start, end) {
  return request(`/api/reports/sales/hourly${qs({ start, end })}`)
}

export function getStockSummary() {
  return request('/api/reports/inventory/stock-summary')
}

export function getWastageSummary(start, end) {
  return request(`/api/reports/inventory/wastage${qs({ start, end })}`)
}

export function getStockMovements(start, end, itemId) {
  return request(`/api/reports/inventory/movements${qs({ start, end, itemId })}`)
}

export function getOccupancyReport(start, end) {
  return request(`/api/reports/occupancy${qs({ start, end })}`)
}

export function getRoomRevenue(start, end) {
  return request(`/api/reports/occupancy/revenue${qs({ start, end })}`)
}

export function getStaffShiftSummary(start, end) {
  return request(`/api/reports/staff/shift-summary${qs({ start, end })}`)
}

export function getMenuPerformance(start, end) {
  return request(`/api/reports/menu/performance${qs({ start, end })}`)
}
