<template>
  <div class="cart-page">
    <div v-if="!auth.isLoggedIn" class="cart-empty">
      <div class="icon">🛒</div>
      <p>请先登录查看购物车</p>
      <button class="btn-primary" style="margin-top:16px;padding:10px 32px;border-radius:20px" @click="$router.push('/auth')">去登录</button>
    </div>
    <div v-else-if="cartStore.items.length === 0" class="cart-empty">
      <div class="icon">🛒</div>
      <p>购物车是空的</p>
      <button class="btn-primary" style="margin-top:16px;padding:10px 32px;border-radius:20px" @click="$router.push('/')">去逛逛</button>
    </div>
    <div v-else>
      <h2 style="margin-bottom:20px;font-size:18px">购物车 <span style="color:var(--text-light);font-size:14px;font-weight:400">({{ cartStore.items.length }}件)</span></h2>
      <div v-for="item in cartStore.items" :key="item.id" class="cart-item">
        <div class="cart-item-img">
          <img v-if="isImageUrl(item.image)" :src="item.image" alt="" />
          <span v-else style="font-size:28px">{{ item.image || '📦' }}</span>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">{{ item.name }}</div>
          <div class="cart-item-price">¥{{ item.price }}</div>
        </div>
        <div class="cart-item-qty">
          <button @click="changeQty(item, -1)">−</button>
          <span>{{ item.quantity }}</span>
          <button @click="changeQty(item, 1)">+</button>
        </div>
        <div style="color:var(--primary);font-weight:700;font-size:16px;min-width:80px;text-align:right">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
        <button class="btn-danger" @click="removeItem(item)">删除</button>
      </div>
      <div class="cart-total">
        <span>合计：</span>
        <span class="total-price">¥{{ cartStore.total.toFixed(2) }}</span>
        <button class="btn-primary" style="padding:12px 40px;border-radius:24px;font-size:16px" @click="$router.push('/checkout')">去结算</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'

const auth = useAuthStore()
const cartStore = useCartStore()
const toast = useToastStore()

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

async function changeQty(item, delta) {
  const newQty = item.quantity + delta
  if (newQty < 1) {
    await cartStore.removeFromCart(item.product_id)
  } else {
    try {
      await cartStore.updateQty(item.product_id, newQty)
    } catch (e) { toast.show(e.message, 'error') }
  }
}

async function removeItem(item) {
  await cartStore.removeFromCart(item.product_id)
  toast.show('已移出购物车', 'success')
}

onMounted(() => cartStore.fetchCart())
</script>
