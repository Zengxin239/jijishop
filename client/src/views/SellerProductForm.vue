<template>
  <div>
    <a class="back-link" @click="$router.push('/seller')">← 返回管理页</a>
    <div style="background:var(--white);border-radius:12px;padding:30px;box-shadow:var(--shadow);max-width:800px">
      <h2 style="margin-bottom:24px">{{ isEdit ? '编辑商品' : '发布商品' }}</h2>
      <div class="form-grid">
        <div class="full"><label>商品名称</label><input v-model="form.name" placeholder="请输入商品名称" /></div>
        <div>
          <label>分类</label>
          <select v-model="form.category">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label>商品图片</label>
          <input v-model="form.image" placeholder="图片URL、/uploads 地址或 emoji" @input="previewImg = form.image" />
          <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" style="margin-top:8px" @change="uploadImage" />
          <div style="font-size:12px;color:var(--text-light);margin-top:6px">支持上传 PNG/JPG，图片会保存在本地磁盘，下次打开仍可显示。</div>
          <div style="margin-top:8px;width:120px;height:120px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img v-if="isImageUrl(previewImg)" :src="previewImg" style="width:100%;height:100%;object-fit:cover" />
            <span v-else style="font-size:40px">{{ previewImg || '📦' }}</span>
          </div>
        </div>
        <div><label>价格 (¥)</label><input v-model.number="form.price" type="number" placeholder="0.00" /></div>
        <div><label>原价 (¥)</label><input v-model.number="form.originalPrice" type="number" placeholder="0.00" /></div>
        <div><label>库存</label><input v-model.number="form.stock" type="number" placeholder="0" /></div>
        <div class="full"><label>商品描述</label><textarea v-model="form.description" placeholder="请输入商品描述"></textarea></div>
        <div class="full" style="display:flex;gap:12px">
          <button class="btn-primary" :disabled="uploading" @click="save">{{ uploading ? '上传中...' : (isEdit ? '保存修改' : '发布商品') }}</button>
          <button class="btn-outline" @click="$router.push('/seller')">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '../stores/toast'
import api from '../api'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const categories = ['电子产品', '服装鞋帽', '家居生活', '食品饮料', '美妆护肤', '图书文具', '运动户外', '母婴用品']
const isEdit = computed(() => !!route.params.id)

const form = ref({ name: '', category: '电子产品', image: '📦', price: null, originalPrice: null, stock: null, description: '' })
const previewImg = ref('📦')
const uploading = ref(false)

function isImageUrl(img) {
  return img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/uploads/'))
}

onMounted(async () => {
  if (isEdit.value) {
    try {
      const p = await api.get(`/products/${route.params.id}`)
      form.value = {
        name: p.name, category: p.category, image: p.image,
        price: p.price, originalPrice: p.original_price,
        stock: p.stock, description: p.description
      }
      previewImg.value = p.image
    } catch (e) { toast.show(e.message, 'error'); router.push('/seller') }
  }
})

async function uploadImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    toast.show('仅支持 PNG 或 JPG 图片', 'error')
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    uploading.value = true
    try {
      const res = await api.post('/products/upload-image', {
        filename: file.name.replace(/\.[^.]+$/, ''),
        dataUrl: reader.result
      })
      form.value.image = res.imageUrl
      previewImg.value = res.imageUrl
      toast.show('图片上传成功', 'success')
    } catch (e) {
      toast.show(e.message, 'error')
    } finally {
      uploading.value = false
      event.target.value = ''
    }
  }
  reader.readAsDataURL(file)
}

async function save() {
  if (uploading.value) return
  if (!form.value.name || !form.value.price) { toast.show('请填写商品名称和价格', 'error'); return }
  try {
    if (isEdit.value) {
      await api.put(`/products/${route.params.id}`, form.value)
      toast.show('商品已更新', 'success')
    } else {
      await api.post('/products', form.value)
      toast.show('商品已添加', 'success')
    }
    router.push('/seller')
  } catch (e) { toast.show(e.message, 'error') }
}
</script>
