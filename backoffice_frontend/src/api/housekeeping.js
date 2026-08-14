import request from './client'

export function listHousekeepingTasks() {
  return request('/api/housekeeping-tasks')
}

export function createHousekeepingTask(data) {
  return request('/api/housekeeping-tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateHousekeepingTask(id, data) {
  return request(`/api/housekeeping-tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteHousekeepingTask(id) {
  return request(`/api/housekeeping-tasks/${id}`, { method: 'DELETE' })
}
