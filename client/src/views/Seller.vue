<template>
  <div>
    <div v-if="!auth.isLoggedIn" style="background:var(--white);border-radius:12px;padding:60px;text-align:center;box-shadow:var(--shadow)">
      <p style="font-size:16px">请先登录后再管理商品</p>
      <button class="btn-primary" style="margin-top:16px;padding:10px 32px;border-radius:20px" @click="$router.push('/auth')">去登录</button>
    </div>
    <div v-else class="seller-layout">
      <div class="seller-sidebar">
        <a href="javascript:void(0)" :class="{ active: tab === 'products' }" @click="switchTab('products')">{{ auth.isAdmin ? '全部商品' : '我的商品' }}</a>
        <a href="javascript:void(0)" :class="{ active: tab === 'orders' }" @click="switchTab('orders')">{{ auth.isAdmin ? '全部订单' : '售出订单' }}</a>
        <a v-if="auth.isAdmin" href="javascript:void(0)" :class="{ active: tab === 'users' }" @click="switchTab('users')">用户管理</a>
      </div>
      <div class="seller-content">
        <div v-if="tab === 'products'">
          <div class="seller-header">
            <h2>{{ auth.isAdmin ? '商品管理' : '我的商品' }}</h2>
            <button class="btn-primary" style="padding:8px 20px;border-radius:6px" @click="$router.push('/seller/product-form')">+ 发布商品</button>
          </div>
          <p v-if="products.length === 0" style="color:var(--text-light);text-align:center;padding:40px">暂无商品</p>
          <table v-else class="seller-table">
            <thead>
              <tr>
                <th>商品名称</th>
                <th>分类</th>
                <th>价格</th>
                <th>库存</th>
                <th>销量</th>
                <th v-if="auth.isAdmin">发布者</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in products" :key="p.id">
                <td>
                  <span style="display:inline-flex;align-items:center;gap:6px">
                    <img v-if="isImageUrl(p.image)" :src="p.image" style="width:30px;height:30px;border-radius:4px;object-fit:cover" />
                    <span v-else style="font-size:20px">{{ p.image || '📦' }}</span>
                    {{ p.name }}
                  </span>
                </td>
                <td>{{ p.category }}</td>
                <td>¥{{ p.price }}</td>
                <td>{{ p.stock }}</td>
                <td>{{ p.sales || 0 }}</td>
                <td v-if="auth.isAdmin">{{ p.seller_name }}</td>
                <td>
                  <button class="btn-sm" @click="$router.push({ name: 'seller-product-edit', params: { id: p.id } })">编辑</button>
                  <button class="btn-danger" style="margin-left:4px" @click="deleteProduct(p.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="tab === 'orders'">
          <h2>{{ auth.isAdmin ? '订单总览' : '售出订单' }}</h2>
          <p v-if="sellerOrders.length === 0" style="color:var(--text-light);text-align:center;padding:40px">暂无订单</p>
          <div v-for="o in sellerOrders" :key="o.id" class="order-card">
            <div class="order-header">
              <span>订单号：{{ o.id }}</span>
              <span>买家：{{ o.username }}</span>
              <span>{{ new Date(o.created_at).toLocaleString('zh-CN') }}</span>
              <span class="order-status" :class="{ done: ['paid', 'shipped', 'completed'].includes(o.status) }">{{ statusMap[o.status] || o.status }}</span>
            </div>
            <div v-for="item in o.items" :key="item.id" class="order-item-disp">
              <div class="order-item-img">
                <img v-if="isImageUrl(item.image)" :src="item.image" alt="" />
                <span v-else style="font-size:20px">{{ item.image || '📦' }}</span>
              </div>
              <div class="order-item-info">{{ item.product_name }} × {{ item.quantity }}</div>
              <div class="order-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
            <div style="font-size:13px;color:var(--text-light)">收货人：{{ o.name }}　{{ o.phone }}　{{ o.address }}</div>
            <div class="order-actions">
              <button v-if="o.status === 'paid'" class="btn-sm" @click="shipOrder(o.id)">发货</button>
            </div>
          </div>
        </div>

        <div v-if="tab === 'users' && auth.isAdmin">
          <h2>用户管理</h2>
          <p v-if="users.length === 0" style="color:var(--text-light);text-align:center;padding:40px">暂无用户</p>
          <table v-else class="seller-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>角色</th>
                <th>新密码</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td><input v-model="u.username" style="width:140px" /></td>
                <td>
                  <select v-model="u.role">
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </td>
                <td><input v-model="u.newPassword" type="password" placeholder="留空不修改" style="width:140px" /></td>
                <td>{{ new Date(u.created_at).toLocaleString('zh-CN') }}</td>
                <td><button class="btn-sm" @click="saveUser(u)">保存</button></td>
              </tr>
            </tbody>
          </table>
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

const tab = ref('products')
const products = ref([])
const sellerOrders = ref([])
const users = ref([])
const statusMap = { unpaid: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

onMounted(async () => {
  if (!auth.isLoggedIn) return
  await loadProducts()
})

async function switchTab(nextTab) {
  tab.value = nextTab
  if (nextTab === 'products') await loadProducts()
  if (nextTab === 'orders') await loadOrders()
  if (nextTab === 'users' && auth.isAdmin) await loadUsers()
}

async function loadProducts() {
  try {
    products.value = auth.isAdmin
      ? await api.get('/products')
      : await api.get(`/products?sellerId=${auth.user.id}`)
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function loadOrders() {
  try {
    sellerOrders.value = await api.get('/orders/seller')
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function loadUsers() {
  try {
    const data = await api.get('/users')
    users.value = data.map(u => ({ ...u, newPassword: '' }))
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function deleteProduct(id) {
  if (!confirm('确定要删除这个商品吗？')) return
  try {
    await api.delete(`/products/${id}`)
    products.value = products.value.filter(p => p.id !== id)
    toast.show('已删除', 'success')
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function shipOrder(id) {
  try {
    await api.put(`/orders/${id}/ship`)
    toast.show('已标记为发货', 'success')
    await loadOrders()
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function saveUser(user) {
  try {
    const updated = await api.put(`/users/${user.id}`, {
      username: user.username,
      role: user.role,
      password: user.newPassword
    })
    Object.assign(user, updated, { newPassword: '' })
    toast.show('用户信息已保存', 'success')
    if (auth.user?.id === user.id) {
      auth.logout()
      toast.show('当前账号信息已变更，请重新登录', 'success')
      router.push('/auth')
      return
    }
    await loadProducts()
  } catch (e) {
    toast.show(e.message, 'error')
  }
}
</script>
