import request from './client'

export function listReservations(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v)
  })
  return request(`/api/reservations${qs.toString() ? `?${qs}` : ''}`)
}
