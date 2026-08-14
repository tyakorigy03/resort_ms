import request from './client'

export function listRoomTypes() {
  return request('/api/room-types')
}

export function createRoomType(data) {
  return request('/api/room-types', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRoomType(id, data) {
  return request(`/api/room-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteRoomType(id) {
  return request(`/api/room-types/${id}`, { method: 'DELETE' })
}
