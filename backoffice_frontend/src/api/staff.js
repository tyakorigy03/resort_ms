import request from './client'

export function listStaff({ active = false } = {}) {
  return request(`/api/staff${active ? '?active=true' : ''}`)
}

export function listStaffRoles() {
  return request('/api/staff/roles')
}

export function listRolesDetailed() {
  return request('/api/staff/roles/detailed')
}

export function createRole(data) {
  return request('/api/staff/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRole(id, data) {
  return request(`/api/staff/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteRole(id) {
  return request(`/api/staff/roles/${id}`, { method: 'DELETE' })
}

export function setRolePermissions(roleId, permissions) {
  return request(`/api/staff/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })
}

export function getStaff(id) {
  return request(`/api/staff/${id}`)
}

export function createStaff(data) {
  return request('/api/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateStaff(id, data) {
  return request(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteStaff(id) {
  return request(`/api/staff/${id}`, { method: 'DELETE' })
}

export function setStaffPin(id, pin) {
  return request(`/api/staff/${id}/pin`, {
    method: 'PUT',
    body: JSON.stringify({ pin }),
  })
}

export function getStaffQr(id) {
  return request(`/api/staff/${id}/qr`)
}

export function linkStaffUser(id, userId) {
  return request(`/api/staff/${id}/link-user`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function unlinkStaffUser(id) {
  return request(`/api/staff/${id}/link-user`, { method: 'DELETE' })
}

export function createStaffUser(id, data) {
  return request(`/api/staff/${id}/user`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
