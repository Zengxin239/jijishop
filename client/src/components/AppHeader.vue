<template>
  <header class="header">
    <div class="header-inner">
      <div class="logo" @click="$router.push('/')">吉吉<span>商城</span></div>
      <div class="search-bar">
        <input v-model="searchQuery" placeholder="搜索商品..." @keydown.enter="doSearch" @input="showSugg" @focus="showSugg" @blur="hideSugg" />
        <button @click="doSearch">搜索</button>
        <div class="search-suggestions" v-if="suggestions.length > 0 && showSuggestions" @mousedown.prevent>
          <div class="suggest-item" v-for="p in suggestions" :key="p.id" @click="goProduct(p)">
            <span class="img-placeholder">{{ renderEmoji(p.image) }}</span>
            <span style="flex:1">{{ p.name }}</span>
            <span style="color:var(--primary)">¥{{ p.price }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <router-link to="/">首页</router-link>
        <router-link to="/cart" class="cart-link">
          购物车 <span class="cart-count" v-if="cartStore.count > 0">{{ cartStore.count }}</span>
        </router-link>
        <template v-if="!auth.isLoggedIn">
          <router-link to="/auth">登录 / 注册</router-link>
        </template>
        <template v-else>
          <div class="user-info" @click="menuOpen = !menuOpen">
            {{ auth.user?.username }} ▾
            <div class="user-dropdown" :class="{ show: menuOpen }">
              <router-link to="/profile">个人中心</router-link>
              <router-link to="/orders">我的订单</router-link>
              <router-link to="/favorites">我的收藏</router-link>
              <router-link to="/seller">{{ auth.isAdmin ? '管理后台' : '商品管理' }}</router-link>
              <a href="javascript:void(0)" @click="doLogout">退出登录</a>
            </div>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import api from '../api'

const router = useRouter()
const auth = useAuthStore()
const cartStore = useCartStore()
const toast = useToastStore()

const searchQuery = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const menuOpen = ref(false)

function renderEmoji(img) {
  if (img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))) return '📷'
  return img || '📦'
}

onMounted(() => {
  cartStore.fetchCart()
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

function closeMenu(e) {
  if (!e.target.closest('.user-info')) menuOpen.value = false
}

function doSearch() {
  showSuggestions.value = false
  router.push({ name: 'home', query: { search: searchQuery.value } })
}

let timer = null
function showSugg() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const q = searchQuery.value.trim()
    if (!q) { suggestions.value = []; showSuggestions.value = false; return }
    try {
      const data = await api.get(`/products?search=${encodeURIComponent(q)}`)
      suggestions.value = data.slice(0, 5)
      showSuggestions.value = data.length > 0
    } catch { suggestions.value = [] }
  }, 200)
}
function hideSugg() { setTimeout(() => { showSuggestions.value = false }, 150) }

function goProduct(p) {
  searchQuery.value = p.name
  showSuggestions.value = false
  router.push({ name: 'detail', params: { id: p.id } })
}

function doLogout() {
  auth.logout()
  cartStore.items = []
  toast.show('已退出登录', 'success')
  router.push('/')
}
</script>

<style scoped>
.header { background: var(--white); border-bottom: 2px solid var(--primary); position: sticky; top: 0; z-index: 100; }
.header-inner { max-width: 1200px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; gap: 20px; }
.logo { font-size: 26px; font-weight: 800; color: var(--primary); cursor: pointer; white-space: nowrap; }
.logo span { color: var(--text); }
.search-bar { flex: 1; display: flex; max-width: 500px; position: relative; }
.search-bar input { flex: 1; padding: 10px 16px; border: 2px solid var(--primary); border-right: none; border-radius: 20px 0 0 20px; font-size: 14px; }
.search-bar button { padding: 10px 24px; background: var(--primary); color: var(--white); border-radius: 0 20px 20px 0; font-size: 14px; font-weight: 600; }
.search-bar button:hover { background: var(--primary-dark); }
.header-actions { display: flex; align-items: center; gap: 16px; }
.header-actions a { color: var(--text-secondary); font-size: 14px; padding: 6px 12px; border-radius: 4px; transition: all .2s; }
.header-actions a:hover { color: var(--primary); background: var(--primary-light); }
.cart-link { position: relative; }
.cart-count { position: absolute; top: -4px; right: -6px; background: var(--primary); color: var(--white); font-size: 11px; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.user-info { position: relative; cursor: pointer; padding: 6px 12px; border-radius: 4px; }
.user-info:hover { background: var(--primary-light); }
.user-dropdown { display: none; position: absolute; top: 100%; right: 0; background: var(--white); border-radius: 8px; box-shadow: var(--shadow); min-width: 140px; overflow: hidden; z-index: 200; }
.user-dropdown.show { display: block; }
.user-dropdown a { display: block; padding: 10px 16px; color: var(--text); font-size: 14px; }
.user-dropdown a:hover { background: var(--primary-light); color: var(--primary); }
.search-suggestions { position: absolute; top: 100%; left: 0; right: 60px; background: var(--white); border-radius: 0 0 8px 8px; box-shadow: 0 6px 16px rgba(0,0,0,.12); z-index: 150; overflow: hidden; margin-top: 2px; }
.suggest-item { display: flex; align-items: center; padding: 10px 16px; cursor: pointer; font-size: 13px; gap: 8px; transition: background .15s; }
.suggest-item:hover { background: var(--primary-light); }
.img-placeholder { width: 24px; height: 24px; font-size: 14px; border-radius: 4px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
@media (max-width: 768px) {
  .header-inner { padding: 10px 12px; flex-wrap: wrap; gap: 10px; }
  .search-bar { order: 3; max-width: 100%; flex-basis: 100%; }
  .logo { font-size: 22px; }
}
</style>
