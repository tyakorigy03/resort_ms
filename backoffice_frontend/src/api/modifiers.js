import request from './client'

export function listModifierGroups() {
  return request('/api/modifier-groups')
}

export function getModifierGroup(id) {
  return request(`/api/modifier-groups/${id}`)
}

export function createModifierGroup(data) {
  return request('/api/modifier-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateModifierGroup(id, data) {
  return request(`/api/modifier-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteModifierGroup(id) {
  return request(`/api/modifier-groups/${id}`, { method: 'DELETE' })
}

export function listModifiers(groupId) {
  return request(groupId ? `/api/modifiers?group_id=${groupId}` : '/api/modifiers')
}

export function getModifier(id) {
  return request(`/api/modifiers/${id}`)
}

export function createModifier(data) {
  return request('/api/modifiers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateModifier(id, data) {
  return request(`/api/modifiers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteModifier(id) {
  return request(`/api/modifiers/${id}`, { method: 'DELETE' })
}
