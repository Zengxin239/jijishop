<template>
  <div>
    <h2 style="margin-bottom:20px;font-size:18px">我的订单</h2>
    <div v-if="orders.length === 0" style="background:var(--white);border-radius:12px;padding:60px 20px;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:48px;margin-bottom:12px">📋</div>
      <p style="color:var(--text-light);font-size:16px">暂无订单</p>
      <button class="btn-primary" style="margin-top:16px;padding:10px 32px;border-radius:20px" @click="$router.push('/')">去逛逛</button>
    </div>
    <div v-for="o in orders" :key="o.id" class="order-card">
      <div class="order-header">
        <span>订单号：{{ o.id }}</span>
        <span>{{ new Date(o.created_at).toLocaleString('zh-CN') }}</span>
        <span class="order-status" :class="{ done: o.status === 'completed' || o.status === 'shipped' }">{{ statusMap[o.status] || o.status }}</span>
      </div>
      <div v-for="item in o.items" :key="item.id" class="order-item-disp">
        <div class="order-item-img">
          <img v-if="isImageUrl(item.image)" :src="item.image" alt="" />
          <span v-else style="font-size:20px">{{ item.image || '📦' }}</span>
        </div>
        <div class="order-item-info">{{ item.product_name }} × {{ item.quantity }}</div>
        <div class="order-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
      </div>
      <div class="order-total">共 {{ o.items.reduce((s, i) => s + i.quantity, 0) }} 件　合计：<strong>¥{{ o.total.toFixed(2) }}</strong><span v-if="o.coupon_code" style="font-size:12px;color:var(--green)"> (已优惠¥{{ o.discount.toFixed(2) }})</span></div>
      <div style="font-size:13px;color:var(--text-light);margin-top:6px">收货人：{{ o.name }}　{{ o.phone }}<br />地址：{{ o.address }}<span v-if="o.coupon_code"><br />优惠码：{{ o.coupon_code }}</span></div>
      <div v-if="o.status === 'unpaid'" style="margin-top:12px;padding:16px;border-radius:10px;background:var(--bg)">
        <div style="font-weight:600;margin-bottom:8px;color:var(--primary)">待支付金额：¥{{ o.total.toFixed(2) }}</div>
        <div style="font-size:13px;color:var(--text-light)">请点击下方按钮完成支付，支付成功后订单状态会自动更新。</div>
      </div>
      <div class="order-actions">
        <button v-if="o.status === 'unpaid'" class="btn-primary" style="padding:10px 20px" @click="payOrder(o.id)">立即支付</button>
        <button v-if="o.status === 'unpaid'" class="btn-sm" @click="cancelOrder(o.id)">取消订单</button>
        <button v-if="o.status === 'shipped'" class="btn-sm" @click="confirmOrder(o)">确认收货</button>
        <button v-if="['cancelled', 'completed'].includes(o.status)" class="btn-danger" @click="deleteOrder(o.id)">删除订单</button>
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
const orders = ref([])
const statusMap = { unpaid: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

onMounted(async () => {
  if (!auth.isLoggedIn) { router.push('/auth'); return }
  await loadOrders()
})

async function loadOrders() {
  try {
    orders.value = await api.get('/orders/my')
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function payOrder(id) {
  try {
    await api.put(`/orders/${id}/pay`)
    toast.show('支付成功，订单已更新为已付款', 'success')
    await loadOrders()
  } catch (e) {
    toast.show(e.message, 'error')
  }
}

async function cancelOrder(id) {
  try {
    await api.put(`/orders/${id}/cancel`)
    toast.show('订单已取消', 'success')
    await loadOrders()
  } catch (e) { toast.show(e.message, 'error') }
}

async function confirmOrder(order) {
  try {
    await api.put(`/orders/${order.id}/confirm`)
    toast.show('已确认收货，快去评价吧', 'success')
    await loadOrders()
    const firstItem = order.items[0]
    if (firstItem) setTimeout(() => router.push({ name: 'detail', params: { id: firstItem.product_id } }), 1500)
  } catch (e) { toast.show(e.message, 'error') }
}

async function deleteOrder(id) {
  if (!confirm('确定删除这条订单记录吗？')) return
  try {
    await api.delete(`/orders/${id}`)
    toast.show('订单已删除', 'success')
    await loadOrders()
  } catch (e) {
    toast.show(e.message, 'error')
  }
}
</script>
