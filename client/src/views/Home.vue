<template>
  <div>
    <!-- Banner -->
    <div class="home-banner" v-if="showBanner">
      <div v-for="(b, i) in banners" :key="i" class="banner-slide" :style="{ backgroundImage: 'url(' + b.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === bannerIdx ? 1 : 0, pointerEvents: i === bannerIdx ? 'auto' : 'none' }" @click="$router.push({ name: 'home', query: { category: b.cat } })">
        <div class="banner-content">
          <h2>{{ b.title }}</h2>
          <p>{{ b.subtitle }}</p>
          <span class="banner-cta">立即抢购 →</span>
        </div>
      </div>
      <button class="banner-arrow banner-prev" @click.stop="prevBanner">&lt;</button>
      <button class="banner-arrow banner-next" @click.stop="nextBanner">&gt;</button>
      <div class="banner-dots">
        <span v-for="(b, i) in banners" :key="i" class="banner-dot" :class="{ active: i === bannerIdx }" @click.stop="goBanner(i)"></span>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <select v-model="sortBy" @change="fetchProducts">
        <option value="default">综合排序</option>
        <option value="price-asc">价格从低到高</option>
        <option value="price-desc">价格从高到低</option>
        <option value="sales">销量优先</option>
        <option value="rating">评分优先</option>
      </select>
      <input type="number" v-model.number="priceMin" placeholder="最低价" />
      <span style="color:var(--text-light)">—</span>
      <input type="number" v-model.number="priceMax" placeholder="最高价" />
      <button class="btn-sm" @click="fetchProducts">筛选</button>
      <button v-if="priceMin || priceMax" class="btn-outline" @click="clearPrice">清除</button>
    </div>

    <!-- Products -->
    <div v-if="products.length === 0" style="text-align:center;padding:60px 20px;color:var(--text-light)">
      <div style="font-size:48px;margin-bottom:12px">🔍</div>
      <p style="font-size:16px">没有找到相关商品</p>
    </div>
    <div v-else class="product-grid">
      <div v-for="p in products" :key="p.id" class="product-card" @click="$router.push({ name: 'detail', params: { id: p.id } })">
        <button class="product-card-fav" :class="{ faved: favMap[p.id] }" @click.stop="toggleFav(p)">
          {{ favMap[p.id] ? '♥' : '♡' }}
        </button>
        <div class="product-card-img">
          <img v-if="isImageUrl(p.image)" :src="p.image" alt="" loading="lazy" />
          <span v-else style="font-size:48px">{{ p.image || '📦' }}</span>
        </div>
        <div class="product-card-body">
          <div class="product-card-name">{{ p.name }}</div>
          <div class="product-card-price">¥{{ p.price }}<span class="original">¥{{ p.original_price }}</span></div>
          <div class="product-card-meta">
            <span>已售 {{ p.sales }}</span>
            <span>⭐{{ p.rating }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recently Viewed -->
    <div class="recently-viewed" v-if="recentItems.length && !$route.query.search && !priceMin && !priceMax">
      <h3 style="font-size:16px;margin-bottom:12px;color:var(--text)">最近浏览</h3>
      <div class="recently-scroll">
        <div v-for="p in recentItems" :key="p.id" class="recently-item" @click="$router.push({ name: 'detail', params: { id: p.id } })">
          <div style="width:100%;height:140px;background:var(--bg);border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <img v-if="isImageUrl(p.image)" :src="p.image" alt="" style="width:100%;height:100%;object-fit:cover" />
            <span v-else style="font-size:36px">{{ p.image || '📦' }}</span>
          </div>
          <div style="font-size:13px;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.3">{{ p.name }}</div>
          <div style="color:var(--primary);font-weight:700;font-size:15px;margin-top:4px">¥{{ p.price }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import api from '../api'

const route = useRoute()
const auth = useAuthStore()
const cartStore = useCartStore()
const toast = useToastStore()

const products = ref([])
const favMap = ref({})
const sortBy = ref('default')
const priceMin = ref(null)
const priceMax = ref(null)
const loading = ref(false)

const banners = [
  { title: '618年中大促', subtitle: '全场低至5折 限时抢购', image: 'https://picsum.photos/id/1025/1200/400', cat: 'all' },
  { title: '数码潮品节', subtitle: '新品尝鲜 直降千元', image: 'https://picsum.photos/id/20/1200/400', cat: '电子产品' },
  { title: '夏季服饰上新', subtitle: '满200减50 还包邮', image: 'https://picsum.photos/id/1035/1200/400', cat: '服装鞋帽' },
  { title: '家居焕新季', subtitle: '品质生活 从家开始', image: 'https://picsum.photos/id/1048/1200/400', cat: '家居生活' },
]
const showBanner = ref(true)
const bannerIdx = ref(0)
let bannerTimer = null

function goBanner(i) {
  bannerIdx.value = i
  restartBanner()
}
function prevBanner() {
  bannerIdx.value = (bannerIdx.value - 1 + banners.length) % banners.length
  restartBanner()
}
function nextBanner() {
  bannerIdx.value = (bannerIdx.value + 1) % banners.length
  restartBanner()
}
function restartBanner() {
  clearInterval(bannerTimer)
  bannerTimer = setInterval(() => {
    bannerIdx.value = (bannerIdx.value + 1) % banners.length
  }, 4000)
}

function clearPrice() {
  priceMin.value = null
  priceMax.value = null
  fetchProducts()
}

const recentIds = ref(JSON.parse(localStorage.getItem('recently_viewed') || '[]'))
const recentItems = ref([])

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

function addRecent(id) {
  let ids = recentIds.value.filter(i => i !== id)
  ids.unshift(id)
  ids = ids.slice(0, 10)
  recentIds.value = ids
  localStorage.setItem('recently_viewed', JSON.stringify(ids))
}

async function fetchProducts() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    const cat = route.query.category
    const search = route.query.search
    if (cat && cat !== 'all') params.set('category', cat)
    if (search) params.set('search', search)
    if (sortBy.value !== 'default') params.set('sort', sortBy.value)
    if (priceMin.value) params.set('priceMin', priceMin.value)
    if (priceMax.value) params.set('priceMax', priceMax.value)
    const data = await api.get(`/products?${params}`)
    products.value = data

    // Show banner only when no filters
    showBanner.value = !search && (!cat || cat === 'all') && sortBy.value === 'default' && !priceMin.value && !priceMax.value

    // Load favorites map
    if (auth.isLoggedIn) {
      try {
        const favs = await api.get('/favorites')
        favMap.value = {}
        favs.forEach(f => { favMap.value[f.product_id] = true })
      } catch { /* ignore */ }
    }

    // Load recently viewed
    const allProducts = data
    recentItems.value = recentIds.value.map(id => allProducts.find(p => p.id === id)).filter(Boolean).slice(0, 6)
  } catch (e) {
    toast.show(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function toggleFav(product) {
  if (!auth.isLoggedIn) { toast.show('请先登录', 'error'); return }
  try {
    const res = await api.post('/favorites/toggle', { productId: product.id })
    favMap.value[product.id] = res.favorited
    toast.show(res.favorited ? '已收藏' : '已取消收藏', 'success')
  } catch (e) { toast.show(e.message, 'error') }
}

watch(() => [route.query.category, route.query.search], () => {
  fetchProducts()
}, { immediate: true })

onMounted(() => {
  if (showBanner.value) restartBanner()
})
onUnmounted(() => { clearInterval(bannerTimer) })
</script>
