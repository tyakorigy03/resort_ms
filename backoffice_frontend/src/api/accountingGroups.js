import request from './client'

export function listAccountingGroups() {
  return request('/api/accounting-groups')
}

export function createAccountingGroup(data) {
  return request('/api/accounting-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateAccountingGroup(id, data) {
  return request(`/api/accounting-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteAccountingGroup(id) {
  return request(`/api/accounting-groups/${id}`, { method: 'DELETE' })
}
