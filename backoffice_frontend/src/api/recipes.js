import request from './client'

export function listRecipes() {
  return request('/api/recipes')
}

export function getRecipe(id) {
  return request(`/api/recipes/${id}`)
}

export function createRecipe(data) {
  return request('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRecipe(id, data) {
  return request(`/api/recipes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteRecipe(id) {
  return request(`/api/recipes/${id}`, { method: 'DELETE' })
}
