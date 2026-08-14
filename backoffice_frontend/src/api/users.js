import request from './client'

export function listUsers({ includeInactive = true } = {}) {
  return request(`/api/users?includeInactive=${includeInactive}`)
}

export function createUser(data) {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateUser(id, data) {
  return request(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setUserPassword(id, password) {
  return request(`/api/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  })
}
