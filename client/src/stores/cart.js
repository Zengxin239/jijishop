import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { useAuthStore } from './auth'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const loading = ref(false)

  const count = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))
  const total = computed(() => items.value.reduce((s, i) => s + i.price * i.quantity, 0))

  async function fetchCart() {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) { items.value = []; return }
    loading.value = true
    try { items.value = await api.get('/cart') } catch { items.value = [] }
    finally { loading.value = false }
  }

  async function addToCart(productId, quantity = 1) {
    await api.post('/cart/add', { productId, quantity })
    await fetchCart()
  }

  async function updateQty(productId, quantity) {
    await api.put(`/cart/${productId}`, { quantity })
    await fetchCart()
  }

  async function removeFromCart(productId) {
    await api.delete(`/cart/${productId}`)
    await fetchCart()
  }

  async function clearCart() {
    await api.delete('/cart')
    items.value = []
  }

  return { items, count, total, loading, fetchCart, addToCart, updateQty, removeFromCart, clearCart }
})
