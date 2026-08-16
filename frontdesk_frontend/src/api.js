const TOKEN_KEY = 'fd_token'
const USER_KEY = 'fd_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
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
    if (res.status === 401 && token && path !== '/api/auth/login') {
      clearSession()
      window.location.reload()
    }
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),

  dashboard: () => request('/api/reservations/dashboard'),

  reservations: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    return request(`/api/reservations${qs.toString() ? `?${qs}` : ''}`)
  },
  createReservation: (body) =>
    request('/api/reservations', { method: 'POST', body }),
  getReservation: (id) => request(`/api/reservations/${id}`),
  updateReservation: (id, body) =>
    request(`/api/reservations/${id}`, { method: 'PUT', body }),
  removeReservation: (id) =>
    request(`/api/reservations/${id}`, { method: 'DELETE' }),
  checkIn: (id, roomId) =>
    request(`/api/reservations/${id}/check-in`, { method: 'POST', body: { roomId } }),
  checkOut: (id, forceReason) =>
    request(`/api/reservations/${id}/check-out`, { method: 'POST', body: { forceReason } }),

  availableRooms: (params) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    return request(`/api/reservations/available-rooms?${qs}`)
  },

  availabilityGrid: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    return request(`/api/reservations/availability-grid?${qs}`)
  },

  stays: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    return request(`/api/reservations/stays?${qs}`)
  },

  folio: (id) => request(`/api/folios/${id}`),
  addFolioLine: (id, body) =>
    request(`/api/folios/${id}/lines`, { method: 'POST', body }),
  postRoomCharges: (id, body) =>
    request(`/api/folios/${id}/room-charges`, { method: 'POST', body }),

  customers: () => request('/api/customers'),
  createCustomer: (body) =>
    request('/api/customers', { method: 'POST', body }),

  rooms: () => request('/api/rooms'),
  roomTypes: () => request('/api/room-types'),
  ratePlans: () => request('/api/rate-plans'),
}
