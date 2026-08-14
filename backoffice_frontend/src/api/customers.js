import request from './client'

export function listCustomers() {
  return request('/api/customers')
}

export function createCustomer(data) {
  return request('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCustomer(id, data) {
  return request(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteCustomer(id) {
  return request(`/api/customers/${id}`, { method: 'DELETE' })
}
