<template>
  <div class="page">
    <div class="card">
      <div class="card-row">
        <div class="card-title">当前版本</div>
        <span class="version-tag">v{{ version }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const version = ref('...')

onMounted(async () => {
  version.value = await window.electronAPI.getAppVersion()
})
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
.card-title { font-size: 14px; font-weight: 600; color: #fff; }
.version-tag {
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #a5b4fc;
  white-space: nowrap;
}
</style>
