import request from './client'

export function listOutlets() {
  return request('/api/outlets')
}

export function createOutlet(data) {
  return request('/api/outlets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateOutlet(id, data) {
  return request(`/api/outlets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteOutlet(id) {
  return request(`/api/outlets/${id}`, { method: 'DELETE' })
}
