<template>
  <div class="toast-wrap">
    <div v-for="t in toasts" :key="t.id" class="toast-msg" :class="[t.type, 'show']">{{ t.msg }}</div>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast'
const toasts = useToastStore().list
</script>
