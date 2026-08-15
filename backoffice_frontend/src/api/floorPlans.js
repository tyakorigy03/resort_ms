import request from './client'

export function listFloorPlans() {
  return request('/api/floor-plans')
}

export function createFloorPlan(data) {
  return request('/api/floor-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFloorPlan(id, data) {
  return request(`/api/floor-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteFloorPlan(id) {
  return request(`/api/floor-plans/${id}`, { method: 'DELETE' })
}

export function listTables(floorPlanId) {
  return request(`/api/tables?floorPlanId=${floorPlanId}`)
}

export function createTable(data) {
  return request('/api/tables', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTable(id, data) {
  return request(`/api/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTable(id) {
  return request(`/api/tables/${id}`, { method: 'DELETE' })
}
