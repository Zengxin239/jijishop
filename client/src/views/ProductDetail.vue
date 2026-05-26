<template>
  <div>
    <a class="back-link" @click="$router.push('/')">← 返回首页</a>
    <div v-if="product">
      <div class="product-detail">
        <div class="product-detail-img">
          <img v-if="isImageUrl(product.image)" :src="product.image" alt="" />
          <span v-else style="font-size:80px">{{ product.image || '📦' }}</span>
        </div>
        <div>
          <div style="color:var(--text-light);font-size:13px;margin-bottom:6px">{{ product.category }} | 发布者：{{ product.seller_name }}</div>
          <div class="product-detail-name">{{ product.name }}</div>
          <div class="product-detail-desc">{{ product.description }}</div>
          <div class="product-detail-price">¥{{ product.price }}<span class="product-detail-original">¥{{ product.original_price }}</span></div>
          <div class="product-detail-info">
            <span>⭐ {{ product.rating }}</span>
            <span>已售 {{ product.sales }}</span>
            <span>库存 {{ product.stock }}</span>
          </div>
          <div style="margin-bottom:8px">
            <label style="font-size:13px;color:var(--text-secondary)">数量：</label>
            <div class="cart-item-qty" style="display:inline-flex;margin-left:8px">
              <button @click="qty > 1 && qty--">−</button>
              <span>{{ qty }}</span>
              <button @click="qty < product.stock ? qty++ : toast.show('库存不足','error')">+</button>
            </div>
          </div>
          <div class="product-detail-actions" v-if="auth.isLoggedIn">
            <button class="btn-secondary" @click="addToCart">加入购物车</button>
            <button class="btn-buy" @click="buyNow">立即购买</button>
            <button class="btn-outline" style="padding:12px 24px;border-radius:24px;font-size:16px" @click="toggleFav">{{ isFaved ? '♥ 已收藏' : '♡ 收藏' }}</button>
          </div>
          <div v-else style="margin-top:12px">
            <button class="btn-primary" @click="$router.push('/auth')">登录后购买</button>
          </div>
        </div>
      </div>

      <!-- Reviews -->
      <div class="reviews-section">
        <h3 style="font-size:16px;margin-bottom:16px">
          商品评价
          <span v-if="avgRating" style="color:var(--primary);font-size:14px">{{ avgRating }}分</span>
          <span style="color:var(--text-light);font-size:13px;font-weight:400">({{ reviews.length }}条)</span>
        </h3>
        <div class="review-form" v-if="canReview">
          <div style="margin-bottom:8px;font-size:13px;color:var(--text-secondary)">发表评价</div>
          <div class="star-rating">
            <span v-for="i in 5" :key="i" class="star" :style="{ color: i <= reviewRating ? 'var(--gold)' : '#ddd' }" @click="reviewRating = i">{{ i <= reviewRating ? '★' : '☆' }}</span>
          </div>
          <textarea v-model="reviewContent" placeholder="说说你的使用感受吧（至少10个字）" style="width:100%;margin-top:8px"></textarea>
          <button class="btn-primary" style="padding:8px 24px;border-radius:6px;margin-top:8px;font-size:14px" @click="submitReview">提交评价</button>
        </div>
        <div v-if="reviews.length === 0" style="color:var(--text-light);text-align:center;padding:30px 0">暂无评价，快来第一个评价吧</div>
        <div v-for="r in reviews" :key="r.id" class="review-card">
          <div class="review-header">
            <span style="font-weight:600">{{ r.username }}</span>
            <span style="color:var(--gold)">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
            <span style="color:var(--text-light);font-size:12px">{{ new Date(r.created_at).toLocaleDateString('zh-CN') }}</span>
          </div>
          <div class="review-body">{{ r.content }}</div>
        </div>
      </div>
    </div>
    <div v-else style="text-align:center;padding:60px">商品不存在</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import api from '../api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cartStore = useCartStore()
const toast = useToastStore()

const product = ref(null)
const qty = ref(1)
const reviews = ref([])
const avgRating = ref(null)
const canReview = ref(false)
const reviewRating = ref(0)
const reviewContent = ref('')
const isFaved = ref(false)

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

async function loadProduct(id) {
  try {
    product.value = await api.get(`/products/${id}`)
    qty.value = 1
    // Recently viewed
    let ids = JSON.parse(localStorage.getItem('recently_viewed') || '[]')
    ids = ids.filter(i => i !== id)
    ids.unshift(id)
    ids = ids.slice(0, 10)
    localStorage.setItem('recently_viewed', JSON.stringify(ids))
    // Reviews
    const revData = await api.get(`/reviews/product/${id}`)
    reviews.value = revData.reviews
    avgRating.value = revData.avgRating
    // Can review
    if (auth.isLoggedIn) {
      const cr = await api.get(`/reviews/can-review/${id}`)
      canReview.value = cr.canReview
      const fav = await api.get(`/favorites/check/${id}`)
      isFaved.value = fav.favorited
    }
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function addToCart() {
  if (!auth.isLoggedIn) { router.push('/auth'); return }
  try {
    await cartStore.addToCart(product.value.id, qty.value)
    qty.value = 1
    toast.show('已加入购物车', 'success')
  } catch (e) { toast.show(e.message, 'error') }
}

async function buyNow() {
  await addToCart()
  router.push('/cart')
}

async function toggleFav() {
  if (!auth.isLoggedIn) { router.push('/auth'); return }
  try {
    const res = await api.post('/favorites/toggle', { productId: product.value.id })
    isFaved.value = res.favorited
    toast.show(res.favorited ? '已收藏' : '已取消收藏', 'success')
  } catch (e) { toast.show(e.message, 'error') }
}

async function submitReview() {
  if (reviewRating.value === 0) { toast.show('请选择评分', 'error'); return }
  if (reviewContent.value.trim().length < 10) { toast.show('评价内容至少10个字', 'error'); return }
  try {
    await api.post('/reviews', {
      productId: product.value.id,
      rating: reviewRating.value,
      content: reviewContent.value
    })
    toast.show('评价成功', 'success')
    reviewRating.value = 0
    reviewContent.value = ''
    loadProduct(product.value.id)
  } catch (e) { toast.show(e.message, 'error') }
}

watch(() => route.params.id, (id) => { if (id) loadProduct(id) }, { immediate: true })
</script>
