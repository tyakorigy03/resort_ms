import request from './client'

export function listWastages({ days } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return request(`/api/wastage${query ? `?${query}` : ''}`)
}

export function createWastage(data) {
  return request('/api/wastage', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
