import request from './client'

export function listMenus() {
  return request('/api/menus')
}

export function getMenu(id) {
  return request(`/api/menus/${id}`)
}

export function createMenu(data) {
  return request('/api/menus', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateMenu(id, data) {
  return request(`/api/menus/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setMenuActive(id, isActive) {
  return request(`/api/menus/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

export function deleteMenu(id) {
  return request(`/api/menus/${id}`, { method: 'DELETE' })
}
