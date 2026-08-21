const API_BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const headers = { ...options.headers }
  if (options.body !== undefined && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(options.body)
  }
  const res = await fetch(API_BASE + path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const api = {
  lookupRoom: (roomNumber) =>
    request('/api/guest/lookup', { method: 'POST', body: { roomNumber } }),

  requestOtp: (reservationId) =>
    request('/api/guest/request-otp', { method: 'POST', body: { reservationId } }),

  verifyOtp: (reservationId, code) =>
    request('/api/guest/verify-otp', { method: 'POST', body: { reservationId, code } }),

  dashboard: (reservationId) =>
    request(`/api/guest/dashboard/${reservationId}`),

  menu: (reservationId) =>
    request(`/api/guest/menu/${reservationId}`),

  createOrder: (reservationId, items, notes) =>
    request('/api/guest/orders', { method: 'POST', body: { reservationId, items, notes } }),

  orders: (reservationId) =>
    request(`/api/guest/orders/${reservationId}`),

  outlets: () =>
    request('/api/guest/outlets'),
}

export const SESSION_KEY = 'guest_session'

export function getGuestSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveGuestSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearGuestSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
