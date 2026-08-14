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
  clockOut: (id, body = {}) => request(`/api/clock/${id}/clock-out`, { method: 'POST', body }),

  salePeriodCurrent: () => request('/api/sale-periods/current'),
  salePeriodOpen: (body = {}) => request('/api/sale-periods/open', { method: 'POST', body }),
  salePeriodClose: (id, body = {}) => request(`/api/sale-periods/${id}/close`, { method: 'POST', body }),
  salePeriodCash: (id) => request(`/api/sale-periods/${id}/cash`),

  drawerOpen: () => request('/api/drawer/open', { method: 'POST' }),

  ordersToday: () => request('/api/pos-orders?date=today'),
  createOrder: (body) => request('/api/pos-orders', { method: 'POST', body }),
}
