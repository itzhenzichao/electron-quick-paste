<template>
  <div class="settings-root">
    <aside class="sidebar">
      <div class="sidebar-header">系统设置</div>
      <nav class="menu">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="menu-item"
          :class="{ active: currentPath === item.path }"
          @click="go(item.path)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </nav>
    </aside>
    <section class="main">
      <div class="main-header">
        <span class="main-title">{{ currentTitle }}</span>
        <button class="btn-close" title="关闭设置" @click="close">✕</button>
      </div>
      <div class="main-body">
        <router-view />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuItems = [
  { path: '/auto-launch', icon: '⚙', label: '开机启动' },
  { path: '/data', icon: '⇄', label: '数据管理' }
]

const currentPath = computed(() => route.path)
const currentTitle = computed(() => {
  const item = menuItems.find(m => m.path === route.path)
  return item ? item.label : '系统设置'
})

function go(path: string) {
  router.push(path)
}

function close() {
  window.electronAPI.closeSettings()
}
</script>

<style scoped>
.settings-root { display: flex; width: 100%; height: 100%; overflow: hidden; }
.sidebar {
  width: 180px;
  background: rgba(0, 0, 0, 0.25);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px 0;
  -webkit-app-region: drag;
}
.sidebar-header {
  padding: 0 20px 16px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.5px;
}
.menu { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-app-region: no-drag;
}
.menu-item:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.menu-item.active { background: rgba(102, 126, 234, 0.25); color: #fff; }
.menu-icon { font-size: 14px; }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.main-header {
  height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  -webkit-app-region: drag;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.main-title { font-size: 14px; font-weight: 600; color: #fff; }
.btn-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border: none;
  font-size: 14px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background 0.15s, color 0.15s;
}
.btn-close:hover { background: rgba(244, 67, 54, 0.25); color: #fff; }
.main-body { flex: 1; padding: 20px; overflow-y: auto; overflow-x: hidden; }
.main-body::-webkit-scrollbar { width: 6px; }
.main-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }
</style>
