const BASE = '/api'

const api = {
  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('token')
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '请求失败')
    return data
  },
  get(path) { return this.request('GET', path) },
  post(path, body) { return this.request('POST', path, body) },
  put(path, body) { return this.request('PUT', path, body) },
  delete(path) { return this.request('DELETE', path) }
}

export default api
