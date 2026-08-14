import request from './client'

export function listProductionCenters() {
  return request('/api/production-centers')
}

export function createProductionCenter(data) {
  return request('/api/production-centers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateProductionCenter(id, data) {
  return request(`/api/production-centers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteProductionCenter(id) {
  return request(`/api/production-centers/${id}`, { method: 'DELETE' })
}
