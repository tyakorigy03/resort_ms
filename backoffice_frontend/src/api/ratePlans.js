import request from './client'

export function listRatePlans() {
  return request('/api/rate-plans')
}

export function createRatePlan(data) {
  return request('/api/rate-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRatePlan(id, data) {
  return request(`/api/rate-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteRatePlan(id) {
  return request(`/api/rate-plans/${id}`, { method: 'DELETE' })
}
