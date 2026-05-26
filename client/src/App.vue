<template>
  <div>
    <AppHeader />
    <CategoryNav v-if="showCategoryNav" />
    <div class="main">
      <router-view />
    </div>
    <Toast />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import CategoryNav from './components/CategoryNav.vue'
import Toast from './components/Toast.vue'

const route = useRoute()
const showCategoryNav = computed(() => ['home', 'detail'].includes(route.name))
</script>
