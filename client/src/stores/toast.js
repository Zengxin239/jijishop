import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const list = ref([])
  let id = 0

  function show(msg, type = 'success') {
    const item = { id: ++id, msg, type }
    list.value.push(item)
    setTimeout(() => {
      const idx = list.value.findIndex(t => t.id === item.id)
      if (idx > -1) list.value.splice(idx, 1)
    }, 2000)
  }

  return { list, show }
})
