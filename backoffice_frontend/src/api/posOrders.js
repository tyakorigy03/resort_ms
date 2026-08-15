import request from './client'

export function getPosStats() {
  return request('/api/pos-orders/stats')
}
