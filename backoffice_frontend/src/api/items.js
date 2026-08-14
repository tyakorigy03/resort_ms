import request from './client'

export function listItems() {
  return request('/api/items')
}

export function getItem(id) {
  return request(`/api/items/${id}`)
}

export function createItem(data) {
  return request('/api/items', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function createItemsBatch(items) {
  return request('/api/items/batch', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export function updateItem(id, data) {
  return request(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteItem(id) {
  return request(`/api/items/${id}`, { method: 'DELETE' })
}

export function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  const headers = {}
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch('/api/uploads', { method: 'POST', headers, body: formData }).then(
    async (res) => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      return data
    },
  )
}
