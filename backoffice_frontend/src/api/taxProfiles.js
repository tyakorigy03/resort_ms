import request from './client'

export function listTaxProfiles() {
  return request('/api/tax-profiles')
}

export function createTaxProfile(data) {
  return request('/api/tax-profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTaxProfile(id, data) {
  return request(`/api/tax-profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTaxProfile(id) {
  return request(`/api/tax-profiles/${id}`, { method: 'DELETE' })
}
