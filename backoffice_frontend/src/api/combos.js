import request from './client'

export function listCombos() {
  return request('/api/combos')
}

export function getCombo(id) {
  return request(`/api/combos/${id}`)
}

export function createCombo(data) {
  return request('/api/combos', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCombo(id, data) {
  return request(`/api/combos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteCombo(id) {
  return request(`/api/combos/${id}`, { method: 'DELETE' })
}
