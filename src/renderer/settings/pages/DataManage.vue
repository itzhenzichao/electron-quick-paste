<template>
  <div class="page">
    <div class="card">
      <div class="card-row">
        <div class="card-text">
          <div class="card-title">导出数据</div>
          <div class="card-desc">将所有粘贴内容保存为 JSON 文件，方便备份或迁移到新电脑。</div>
        </div>
        <button class="btn" @click="onExport" :disabled="exporting">
          {{ exporting ? '导出中...' : '导出数据' }}
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-text">
        <div class="card-title">导入数据</div>
        <div class="card-desc">从备份 JSON 文件导入数据到当前设备。</div>
      </div>
      <div class="mode-group">
        <label class="mode-item" :class="{ active: mode === 'merge' }">
          <input type="radio" v-model="mode" value="merge" />
          <span>合并：跳过重复内容，追加新内容</span>
        </label>
        <label class="mode-item" :class="{ active: mode === 'replace' }">
          <input type="radio" v-model="mode" value="replace" />
          <span>覆盖：清空当前数据后导入（不可恢复）</span>
        </label>
      </div>
      <div class="card-row">
        <div></div>
        <button class="btn" :class="{ danger: mode === 'replace' }" @click="onImport" :disabled="importing">
          {{ importing ? '导入中...' : '导入数据' }}
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
  </div>

  <div class="toast" :class="{ show: toast.show }">{{ toast.message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const exporting = ref(false)
const importing = ref(false)
const mode = ref<'merge' | 'replace'>('merge')
const errorMsg = ref('')

const toast = ref({ show: false, message: '' })
let toastTimer: number | null = null
function showToast(msg: string) {
  toast.value = { show: true, message: msg }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value.show = false }, 2500)
}

async function onExport() {
  exporting.value = true
  errorMsg.value = ''
  try {
    const res = await window.electronAPI.exportData()
    if (res.ok) {
      showToast(`已导出：${res.filePath}`)
    } else if (!res.canceled) {
      errorMsg.value = res.error ?? '未知错误'
      showToast(`导出失败：${res.error}`)
    }
  } finally {
    exporting.value = false
  }
}

async function onImport() {
  importing.value = true
  errorMsg.value = ''
  try {
    const res = await window.electronAPI.importData(mode.value)
    if (res.ok) {
      showToast(`导入成功：新增 ${res.count} 条`)
    } else if (!res.canceled) {
      errorMsg.value = res.error ?? '未知错误'
      showToast(`导入失败：${res.error}`)
    }
  } finally {
    importing.value = false
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

.mode-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 14px 0;
}
.mode-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.mode-item:hover { background: rgba(255, 255, 255, 0.04); }
.mode-item.active { background: rgba(102, 126, 234, 0.15); color: #fff; }
.mode-item input { cursor: pointer; margin: 0; }

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn:hover:not(:disabled) { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.danger { background: rgba(244, 67, 54, 0.85); }
.btn.danger:hover:not(:disabled) { background: rgba(244, 67, 54, 1); opacity: 1; }

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
  word-break: break-all;
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
