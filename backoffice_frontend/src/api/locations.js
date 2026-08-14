import request from './client'

export function listLocations() {
  return request('/api/locations')
}

export function createLocation(data) {
  return request('/api/locations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateLocation(id, data) {
  return request(`/api/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteLocation(id) {
  return request(`/api/locations/${id}`, {
    method: 'DELETE',
  })
}
