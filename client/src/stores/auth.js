import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAuthStore = defineStore('auth', () => {
  const savedUser = JSON.parse(localStorage.getItem('user') || 'null')
  if (savedUser?.role === 'seller' || savedUser?.role === 'buyer') savedUser.role = 'user'
  const user = ref(savedUser)
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const canManageProducts = computed(() => !!user.value)

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  async function register(username, password) {
    const data = await api.post('/auth/register', { username, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { user, token, isLoggedIn, isAdmin, canManageProducts, login, register, logout }
})
