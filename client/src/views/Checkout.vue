<template>
  <div v-if="cartStore.items.length === 0" style="text-align:center;padding:60px;color:var(--text-light)">
    <p>购物车为空</p>
    <button class="btn-primary" style="margin-top:16px" @click="$router.push('/cart')">返回购物车</button>
  </div>
  <div v-else class="checkout-page">
    <div class="checkout-form-card">
      <h3>收货信息</h3>
      <div class="form-group"><label>收货人</label><input v-model="name" placeholder="请输入收货人姓名" /></div>
      <div class="form-group"><label>手机号</label><input v-model="phone" placeholder="请输入手机号码" /></div>
      <div class="form-group"><label>收货地址</label><textarea v-model="address" placeholder="请输入详细收货地址" style="height:80px"></textarea></div>
      <div class="form-group"><label>备注（选填）</label><input v-model="note" placeholder="订单备注" /></div>
    </div>
    <div class="checkout-summary">
      <h3>订单摘要</h3>
      <div v-for="item in cartStore.items" :key="item.id" class="checkout-item">
        <span>{{ item.name }} × {{ item.quantity }}</span>
        <span>¥{{ (item.price * item.quantity).toFixed(2) }}</span>
      </div>
      <div class="coupon-section">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">优惠码</div>
        <div style="display:flex;gap:8px">
          <input v-model="couponCode" placeholder="输入优惠码" style="flex:1" @keydown.enter="applyCoupon" />
          <button class="btn-sm" @click="applyCoupon">使用</button>
        </div>
        <div v-if="couponMsg" :style="{ fontSize: '12px', marginTop: '4px', color: appliedCoupon ? 'var(--green)' : '#cf1322' }">{{ couponMsg }}</div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
          <span v-for="c in availableCoupons" :key="c.code" class="coupon-chip" @click="couponCode = c.code; applyCoupon()" :title="c.description">{{ c.code }}</span>
        </div>
      </div>
      <div v-if="appliedCoupon" class="checkout-item" style="color:var(--green)">
        <span>优惠 -{{ appliedCoupon.code }}</span><span>-¥{{ appliedCoupon.discount.toFixed(2) }}</span>
      </div>
      <div class="checkout-total">
        <span>实付金额</span>
        <span class="price">¥{{ finalTotal.toFixed(2) }}</span>
      </div>
      <div style="font-size:12px;color:var(--text-light);margin-top:8px">订单创建后会跳转到“我的订单”，请在订单详情中完成支付。</div>
      <button class="btn-primary" style="width:100%;padding:14px;border-radius:8px;margin-top:16px;font-size:16px" @click="placeOrder">提交订单并去付款</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import api from '../api'

const router = useRouter()
const auth = useAuthStore()
const cartStore = useCartStore()
const toast = useToastStore()

const name = ref('')
const phone = ref('')
const address = ref('')
const note = ref('')
const couponCode = ref('')
const appliedCoupon = ref(null)
const couponMsg = ref('')
const availableCoupons = ref([])

const finalTotal = computed(() => {
  if (appliedCoupon.value) return Math.max(0, cartStore.total - appliedCoupon.value.discount)
  return cartStore.total
})

onMounted(async () => {
  await cartStore.fetchCart()
  if (cartStore.items.length === 0) return
  try { availableCoupons.value = await api.get(`/coupons/available?orderTotal=${cartStore.total}`) } catch { /* ignore */ }
})

async function applyCoupon() {
  const code = couponCode.value.trim()
  if (!code) { couponMsg.value = ''; appliedCoupon.value = null; return }
  try {
    const res = await api.post('/coupons/apply', { code, orderTotal: cartStore.total })
    if (res.valid) {
      appliedCoupon.value = res
      couponMsg.value = `✓ ${res.description} 优惠 ¥${res.discount.toFixed(2)}`
    } else {
      appliedCoupon.value = null
      couponMsg.value = `✗ ${res.msg}`
    }
  } catch (e) { toast.show(e.message, 'error') }
}

async function placeOrder() {
  if (!name.value || !phone.value || !address.value) { toast.show('请填写完整的收货信息', 'error'); return }
  try {
    await api.post('/orders', {
      name: name.value, phone: phone.value, address: address.value, note: note.value,
      discount: appliedCoupon.value?.discount || 0,
      couponCode: appliedCoupon.value?.code || null,
      originalTotal: cartStore.total
    })
    await cartStore.clearCart()
    await cartStore.fetchCart()
    toast.show('订单已创建，请完成付款', 'success')
    router.push('/orders')
  } catch (e) { toast.show(e.message, 'error') }
}
</script>
