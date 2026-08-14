import request from './client'

export function listDevices() {
  return request('/api/devices')
}

export function createDevice(data) {
  return request('/api/devices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateDevice(id, data) {
  return request(`/api/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteDevice(id) {
  return request(`/api/devices/${id}`, { method: 'DELETE' })
}

export function setDevicePin(id, pin) {
  return request(`/api/devices/${id}/pin`, {
    method: 'PUT',
    body: JSON.stringify({ pin }),
  })
}
