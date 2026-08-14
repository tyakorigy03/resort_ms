import request from './client'

export function listPurchases({ days } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return request(`/api/purchases${query ? `?${query}` : ''}`)
}

export function createPurchase(data) {
  return request('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function sendPurchase(id, data) {
  return request(`/api/purchases/${id}/send`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function receivePurchase(id, { items, staff, notes, attachments }) {
  const body = new FormData()
  body.append('items', JSON.stringify(items))
  body.append('staff', staff || '')
  if (notes) body.append('notes', notes)
  for (const file of attachments || []) {
    body.append('attachments', file)
  }
  return request(`/api/purchases/${id}/receive`, {
    method: 'PUT',
    body,
  })
}

export async function fetchAttachmentBlob(id, fileId) {
  const res = await request(`/api/purchases/${id}/attachments/${fileId}`, { raw: true })
  if (!res.ok) throw new Error('Failed to download attachment')
  return res.blob()
}

export function fetchPurchaseReport({ days } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return request(`/api/purchases/reports${query ? `?${query}` : ''}`)
}

export function fetchSupplierPurchaseReport(id, { days } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return request(`/api/purchases/reports/supplier/${id}${query ? `?${query}` : ''}`)
}

export function fetchItemPurchaseReport(id, { days } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return request(`/api/purchases/reports/item/${id}${query ? `?${query}` : ''}`)
}
