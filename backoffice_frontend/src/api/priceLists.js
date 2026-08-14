import request from './client'

export function listPriceLists() {
  return request('/api/price-lists')
}

export function createPriceList(data) {
  return request('/api/price-lists', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updatePriceList(id, data) {
  return request(`/api/price-lists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deletePriceList(id) {
  return request(`/api/price-lists/${id}`, { method: 'DELETE' })
}

export function setDefaultPriceList(id) {
  return request(`/api/price-lists/${id}/default`, { method: 'PUT' })
}

export function listPriceListItems(id) {
  return request(`/api/price-lists/${id}/items`)
}

export function setPriceListItems(id, prices) {
  return request(`/api/price-lists/${id}/items`, {
    method: 'PUT',
    body: JSON.stringify({ prices }),
  })
}
