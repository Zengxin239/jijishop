<template>
  <div class="auth-page">
    <div class="auth-tabs">
      <button :class="{ active: tab === 'login' }" @click="tab = 'login'">登录</button>
      <button :class="{ active: tab === 'register' }" @click="tab = 'register'">注册</button>
    </div>

    <!-- Login -->
    <div v-if="tab === 'login'" class="auth-form">
      <div class="form-group"><label>用户名</label><input v-model="loginUsername" placeholder="请输入用户名" @keydown.enter="doLogin" /></div>
      <div class="form-group"><label>密码</label><input v-model="loginPassword" type="password" placeholder="请输入密码" @keydown.enter="doLogin" /></div>
      <div v-if="loginError" style="color:#cf1322;font-size:13px;margin-bottom:8px">{{ loginError }}</div>
      <button class="btn-primary" style="width:100%;padding:12px;border-radius:6px" @click="doLogin">登录</button>
    </div>

    <!-- Register -->
    <div v-if="tab === 'register'" class="auth-form">
      <div class="form-group"><label>用户名</label><input v-model="regUsername" placeholder="请输入用户名" /></div>
      <div class="form-group"><label>密码</label><input v-model="regPassword" type="password" placeholder="请输入密码" /></div>
      <div class="form-group"><label>确认密码</label><input v-model="regPassword2" type="password" placeholder="请再次输入密码" /></div>
      <div style="font-size:13px;color:var(--text-light);margin-bottom:12px">注册后默认为普通用户，可购买商品，也可发布自己的卖品。</div>
      <div v-if="regError" style="color:#cf1322;font-size:13px;margin-bottom:8px">{{ regError }}</div>
      <button class="btn-primary" style="width:100%;padding:12px;border-radius:6px" @click="doRegister">注册</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const auth = useAuthStore()
const cartStore = useCartStore()
const toast = useToastStore()

const tab = ref('login')
const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const regUsername = ref('')
const regPassword = ref('')
const regPassword2 = ref('')
const regError = ref('')

async function doLogin() {
  loginError.value = ''
  if (!loginUsername.value || !loginPassword.value) { loginError.value = '请填写用户名和密码'; return }
  try {
    await auth.login(loginUsername.value, loginPassword.value)
    toast.show('登录成功', 'success')
    await cartStore.fetchCart()
    router.push('/')
  } catch (e) { loginError.value = e.message }
}

async function doRegister() {
  regError.value = ''
  if (!regUsername.value || !regPassword.value) { regError.value = '请填写完整信息'; return }
  if (regPassword.value !== regPassword2.value) { regError.value = '两次密码不一致'; return }
  try {
    await auth.register(regUsername.value, regPassword.value)
    toast.show('注册成功', 'success')
    await cartStore.fetchCart()
    router.push('/')
  } catch (e) { regError.value = e.message }
}
</script>
