import request from './client'

export function login(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function getMe() {
  return request('/api/auth/me')
}
