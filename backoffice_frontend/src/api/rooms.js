import request from './client'

export function listRooms() {
  return request('/api/rooms')
}

export function getRoom(id) {
  return request(`/api/rooms/${id}`)
}

export function createRoom(data) {
  return request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRoom(id, data) {
  return request(`/api/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteRoom(id) {
  return request(`/api/rooms/${id}`, { method: 'DELETE' })
}
