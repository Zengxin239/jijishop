<template>
  <div class="profile-page">
    <h2>个人中心</h2>
    <div class="profile-info">
      <p><strong>用户名</strong> {{ auth.user?.username }}</p>
      <p><strong>角色</strong> {{ auth.isAdmin ? '管理员' : '用户' }}</p>
      <p><strong>ID</strong> {{ auth.user?.id }}</p>
      <p><strong>注册时间</strong> {{ auth.user?.created_at ? new Date(auth.user.created_at).toLocaleString('zh-CN') : '' }}</p>
    </div>
    <button class="btn-secondary" style="margin-top:20px" @click="$router.push('/orders')">查看我的订单</button>
    <button v-if="auth.canManageProducts" class="btn-secondary" style="margin-left:10px" @click="$router.push('/seller')">{{ auth.isAdmin ? '进入管理后台' : '管理我的商品' }}</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

onMounted(() => {
  if (!auth.isLoggedIn) router.push('/auth')
})
</script>
