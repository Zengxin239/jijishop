<template>
  <div class="category-nav" v-if="categories.length">
    <div class="category-nav-inner">
      <a href="javascript:void(0)" :class="{ active: $route.query.category === 'all' || !$route.query.category }" @click="select('all')">全部</a>
      <a v-for="c in categories" :key="c" href="javascript:void(0)" :class="{ active: $route.query.category === c }" @click="select(c)">{{ c }}</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'

const router = useRouter()
const route = useRoute()
const categories = ref([])

onMounted(async () => {
  try {
    const data = await api.get('/products')
    const cats = [...new Set(data.map(p => p.category))]
    categories.value = cats
  } catch { /* ignore */ }
})

function select(cat) {
  router.push({ name: 'home', query: { category: cat } })
}
</script>

<style scoped>
.category-nav { background: var(--white); border-bottom: 1px solid var(--border); overflow-x: auto; white-space: nowrap; }
.category-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; gap: 4px; }
.category-nav a { display: inline-block; padding: 12px 18px; color: var(--text-secondary); font-size: 14px; border-bottom: 2px solid transparent; transition: all .2s; }
.category-nav a:hover, .category-nav a.active { color: var(--primary); border-bottom-color: var(--primary); }
</style>
