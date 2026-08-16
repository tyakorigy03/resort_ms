const TOKEN_KEY = 'pos_device_token'
const DEVICE_KEY = 'pos_device_info'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getDevice() {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveSession({ token, device }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(DEVICE_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(options.body)
  }
  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token && path !== '/api/devices/authenticate') {
      clearSession()
      window.location.reload()
    }
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export const api = {
  authenticate: (code) =>
    request('/api/devices/authenticate', { method: 'POST', body: { code } }),

  items: () => request('/api/items'),

  staffActive: () => request('/api/staff/active'),

  clockActive: () => request('/api/clock/active'),
  clockIn: (body) => request('/api/clock/clock-in', { method: 'POST', body }),
  clockSummary: (id) => request(`/api/clock/${id}`),
  clockOut: (id, body) => request(`/api/clock/${id}/clock-out`, { method: 'POST', body }),

  salePeriodCurrent: () => request('/api/sale-periods/current'),
  salePeriodOpen: (body = {}) => request('/api/sale-periods/open', { method: 'POST', body }),
  salePeriodClose: (id, body = {}) => request(`/api/sale-periods/${id}/close`, { method: 'POST', body }),
  salePeriodCash: (id) => request(`/api/sale-periods/${id}/cash`),

  drawerOpen: () => request('/api/drawer/open', { method: 'POST' }),

  drawerToday: (drawerId) => request(`/api/cash-drawers/${drawerId}/today`),
  drawerConfirm: (drawerId, body) => request(`/api/cash-drawers/${drawerId}/confirm`, { method: 'POST', body }),

  ordersToday: () => request('/api/pos-orders?date=today'),
  createOrder: (body) => request('/api/pos-orders', { method: 'POST', body }),

  floorPlans: () => request('/api/floor-plans'),
  tables: (floorPlanId) => request(`/api/tables?floorPlanId=${floorPlanId}`),
  tableSessionsActive: () => request('/api/table-sessions/active'),
  tableSessionOpen: (body) => request('/api/table-sessions/open', { method: 'POST', body }),
  tableSessionClose: (id) => request(`/api/table-sessions/${id}/close`, { method: 'POST', body: {} }),

  posOrders: (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    return request(`/api/pos-orders${qs ? `?${qs}` : ''}`)
  },
  posOrder: (id) => request(`/api/pos-orders/${id}`),
  updateOrder: (id, body) => request(`/api/pos-orders/${id}`, { method: 'PUT', body }),
  addItems: (id, items) => request(`/api/pos-orders/${id}/items`, { method: 'POST', body: { items } }),
  removeItem: (id, itemId) => request(`/api/pos-orders/${id}/items/${itemId}`, { method: 'DELETE' }),
  refundItem: (id, itemId) => request(`/api/pos-orders/${id}/items/${itemId}/refund`, { method: 'POST', body: {} }),
  moveItem: (id, itemId, body) => request(`/api/pos-orders/${id}/items/${itemId}/move`, { method: 'PATCH', body }),
  addCourse: (id) => request(`/api/pos-orders/${id}/courses`, { method: 'POST', body: {} }),
  fireCourse: (id, courseId) => request(`/api/pos-orders/${id}/courses/${courseId}/fire`, { method: 'POST', body: {} }),
  serveCourse: (id, courseId) => request(`/api/pos-orders/${id}/courses/${courseId}/serve`, { method: 'POST', body: {} }),
  setCourseStatus: (id, courseId, status) => request(`/api/pos-orders/${id}/courses/${courseId}/status`, { method: 'PATCH', body: { status } }),
  splitCheck: (id) => request(`/api/pos-orders/${id}/split`, { method: 'POST', body: {} }),
  checkout: (id, body) => request(`/api/pos-orders/${id}/checkout`, { method: 'POST', body }),

  customers: () => request('/api/customers'),
  createCustomer: (body) => request('/api/customers', { method: 'POST', body }),
}
