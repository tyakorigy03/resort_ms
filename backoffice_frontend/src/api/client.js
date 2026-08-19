const API_BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = { ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (!isFormData && !options.raw) headers['Content-Type'] = 'application/json'
  const res = await fetch(API_BASE + path, { ...options, headers })
  if (options.raw) return res
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export default request
