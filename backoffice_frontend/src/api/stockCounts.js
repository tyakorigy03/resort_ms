import request from './client'

export function listStockCounts({ days } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return request(`/api/stock-counts${query ? `?${query}` : ''}`)
}

export function createStockCount(data) {
  return request('/api/stock-counts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
