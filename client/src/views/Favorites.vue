<template>
  <div>
    <h2 style="margin-bottom:20px;font-size:18px">我的收藏 <span v-if="favorites.length" style="color:var(--text-light);font-size:14px;font-weight:400">({{ favorites.length }}件)</span></h2>
    <div v-if="favorites.length === 0" style="background:var(--white);border-radius:12px;padding:60px 20px;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:48px;margin-bottom:12px">♡</div>
      <p style="color:var(--text-light);font-size:16px">暂无收藏商品</p>
      <button class="btn-primary" style="margin-top:16px;padding:10px 32px;border-radius:20px" @click="$router.push('/')">去逛逛</button>
    </div>
    <div v-else class="product-grid">
      <div v-for="f in favorites" :key="f.id" class="product-card" @click="$router.push({ name: 'detail', params: { id: f.product_id } })">
        <button class="product-card-fav faved" @click.stop="removeFav(f)">♥</button>
        <div class="product-card-img">
          <img v-if="isImageUrl(f.image)" :src="f.image" alt="" />
          <span v-else style="font-size:48px">{{ f.image || '📦' }}</span>
        </div>
        <div class="product-card-body">
          <div class="product-card-name">{{ f.name }}</div>
          <div class="product-card-price">¥{{ f.price }}<span class="original">¥{{ f.original_price }}</span></div>
          <div class="product-card-meta"><span>已售 {{ f.sales }}</span><span>⭐{{ f.rating }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import api from '../api'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const favorites = ref([])

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

onMounted(async () => {
  if (!auth.isLoggedIn) { router.push('/auth'); return }
  try { favorites.value = await api.get('/favorites') } catch (e) { toast.show(e.message, 'error') }
})

async function removeFav(f) {
  try {
    await api.post('/favorites/toggle', { productId: f.product_id })
    favorites.value = favorites.value.filter(x => x.id !== f.id)
    toast.show('已取消收藏', 'success')
  } catch (e) { toast.show(e.message, 'error') }
}
</script>
