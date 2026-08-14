import request from './client'

export function listStockLevels({ locationId } = {}) {
  const params = new URLSearchParams()
  if (locationId) params.set('locationId', String(locationId))
  const query = params.toString()
  return request(`/api/stock-levels${query ? `?${query}` : ''}`)
}
