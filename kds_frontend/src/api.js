const TOKEN_KEY = 'kds_device_token'
const DEVICE_KEY = 'kds_device_info'

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

const API_BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(options.body)
  }
  const res = await fetch(API_BASE + path, { ...options, headers })
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

  tickets: () => request('/api/kds/tickets'),
  updateItemStatus: (itemId, status) =>
    request(`/api/kds/items/${itemId}/status`, { method: 'PATCH', body: { status } }),

  kdsSettings: () => request('/api/kds-settings'),
  updateKdsSettings: (body) => request('/api/kds-settings', { method: 'PUT', body }),
}
