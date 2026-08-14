import request from './client'

export function listSuppliers() {
  return request('/api/suppliers')
}

export function createSupplier(data) {
  return request('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateSupplier(id, data) {
  return request(`/api/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteSupplier(id) {
  return request(`/api/suppliers/${id}`, { method: 'DELETE' })
}
