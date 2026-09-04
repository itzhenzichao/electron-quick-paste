<template>
  <div class="page">
    <div class="card">
      <div class="card-row">
        <div class="card-text">
          <div class="card-title">开机自动启动</div>
          <div class="card-desc">系统登录后自动启动 NianYiTuo，悬浮球默认出现在上次保存的位置。</div>
        </div>
        <n-switch v-model:value="enabled" :loading="loading" @update:value="onChange" />
      </div>
    </div>
    <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
  </div>

  <div class="toast" :class="{ show: toast.show }">{{ toast.message }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const enabled = ref(false)
const loading = ref(false)
const errorMsg = ref('')

const toast = ref({ show: false, message: '' })
let toastTimer: number | null = null
function showToast(msg: string) {
  toast.value = { show: true, message: msg }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value.show = false }, 2500)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await window.electronAPI.getAutoLaunch()
    if (res.ok) {
      enabled.value = res.enabled
    } else {
      errorMsg.value = `读取失败：${res.error ?? '未知错误'}`
    }
  } finally {
    loading.value = false
  }
})

async function onChange(v: boolean) {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await window.electronAPI.setAutoLaunch(v)
    if (res.ok) {
      enabled.value = res.enabled
      showToast(res.enabled ? '已开启开机启动' : '已关闭开机启动')
    } else {
      enabled.value = res.enabled
      errorMsg.value = res.error ?? '未知错误'
      showToast(`设置失败：${res.error ?? '未知错误'}`)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; overflow-x: hidden; }
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 16px 20px;
}
.card-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.card-text { flex: 1; min-width: 0; }
.card-title { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 6px; }
.card-desc { font-size: 12px; color: rgba(255, 255, 255, 0.55); line-height: 1.5; }
.error-box {
  margin-top: 4px;
  padding: 10px 12px;
  background: rgba(244, 67, 54, 0.12);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: #ff9a8b;
  line-height: 1.5;
  word-break: break-all;
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(102, 126, 234, 0.95);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  display: none;
  z-index: 2000;
  max-width: 80%;
  text-align: center;
}
.toast.show {
  display: block;
  animation: slideUp 2.5s ease;
}
@keyframes slideUp {
  0%, 100% { opacity: 0; transform: translate(-50%, 10px); }
  15%, 85% { opacity: 1; transform: translate(-50%, 0); }
}
</style>
