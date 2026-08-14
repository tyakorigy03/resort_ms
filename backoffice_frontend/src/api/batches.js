import request from './client'

export function listBatches({ days, status } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  if (status) params.set('status', status)
  const query = params.toString()
  return request(`/api/batches${query ? `?${query}` : ''}`)
}

export function getBatch(id) {
  return request(`/api/batches/${id}`)
}

export function runBatch(data) {
  return request('/api/batches', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function setBatchStatus(id, status) {
  return request(`/api/batches/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
