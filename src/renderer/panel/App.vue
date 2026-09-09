<template>
  <div class="container">
    <div class="panel-header" @mousedown="onPanelHeaderMouseDown">
      <span class="panel-title">快捷粘贴</span>
      <div class="header-actions">
        <button class="btn-icon" title="添加" @click="openAddModal">+</button>
        <button class="btn-icon btn-settings" title="系统设置" @click="onSettingsClick">⚙</button>
        <button class="btn-icon btn-quit" title="退出应用" @click="onQuitClick">{{ isMac ? '⏻' : '🔌' }}</button>
        <button class="btn-icon btn-close" title="收起面板" @click="onCloseClick">-</button>
      </div>
    </div>
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" v-model="keyword" placeholder="搜索内容...">
    </div>
    <div class="snippet-list" ref="snippetListRef">
      <div v-if="filteredSnippets.length === 0" class="empty-state">
        <template v-if="keyword.trim() === ''">
          <div>暂无快捷文本</div>
          <div class="empty-hint">点击 + 添加</div>
        </template>
        <div v-else>未找到匹配内容</div>
      </div>
      <div
        v-for="item in filteredSnippets"
        :key="item.id"
        class="snippet-item"
        @click="onItemClick(item)"
      >
        <div class="snippet-content">{{ item.content }}</div>
        <div class="snippet-actions">
          <button class="btn-action edit" title="编辑" @click.stop="onEditClick(item)">✎</button>
          <button class="btn-action delete" title="删除" @click.stop="onDeleteClick(item.id)">✕</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" v-if="editModal.show" @click.self="closeEditModal">
    <div class="modal">
      <div class="modal-title">{{ editModal.title }}</div>
      <textarea
        class="modal-textarea"
        v-model="editModal.content"
        placeholder="输入要保存的内容..."
        rows="5"
        ref="editTextareaRef"
        @keydown="onEditKeydown"
      ></textarea>
      <div class="modal-actions">
        <button class="btn-modal cancel" @click="closeEditModal">取消</button>
        <button class="btn-modal confirm" @click="saveSnippet">保存</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" v-if="quitModal.show" @click.self="quitModal.show = false">
    <div class="modal">
      <div class="modal-title">退出应用</div>
      <div class="modal-text">确定要退出快捷粘贴应用吗？</div>
      <div class="modal-actions">
        <button class="btn-modal cancel" @click="quitModal.show = false">取消</button>
        <button class="btn-modal danger" @click="confirmQuit">退出</button>
      </div>
    </div>
  </div>

  <div class="toast" :class="{ show: toast.show }">{{ toast.message }}</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import Sortable from 'sortablejs'
import { useSnippetsStore } from './stores/snippets'
import type { Snippet } from '../../../preload'

const store = useSnippetsStore()
const keyword = ref('')
const filteredSnippets = computed(() =>
  keyword.value.trim()
    ? store.list.filter(s => s.content.toLowerCase().includes(keyword.value.toLowerCase()))
    : store.list
)

const isMac = window.electronAPI.getPlatform() === 'darwin'

const editModal = ref({ show: false, content: '', title: '', id: null as number | null })
const editTextareaRef = ref<HTMLTextAreaElement | null>(null)
const quitModal = ref({ show: false })
const toast = ref({ show: false, message: '' })

let toastTimer: number | null = null
function showToast(msg: string) {
  toast.value = { show: true, message: msg }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value.show = false }, 1500)
}

function openAddModal() {
  editModal.value = { show: true, content: '', title: '添加内容', id: null }
  nextTick(() => editTextareaRef.value?.focus())
}

function onEditClick(snippet: Snippet) {
  editModal.value = { show: true, content: snippet.content, title: '编辑内容', id: snippet.id }
  nextTick(() => editTextareaRef.value?.focus())
}

function closeEditModal() {
  editModal.value.show = false
  editModal.value.id = null
}

async function saveSnippet() {
  const content = editModal.value.content.trim()
  if (!content) { showToast('内容不能为空'); return }
  const id = editModal.value.id
  if (id) {
    await store.update(id, content)
    showToast('已更新')
  } else {
    await store.add(content)
    showToast('已添加')
  }
  closeEditModal()
}

async function onDeleteClick(id: number) {
  await store.remove(id)
  showToast('已删除')
}

async function onItemClick(snippet: Snippet) {
  await window.electronAPI.copyToClipboard(snippet.content)
  showToast('已复制到剪贴板')
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    saveSnippet()
  }
}

function onQuitClick() {
  quitModal.value.show = true
}

function onSettingsClick() {
  window.electronAPI.openSettings()
}

function confirmQuit() {
  window.electronAPI.quitApp()
}

function onCloseClick() {
  window.electronAPI.closePanel()
}

const snippetListRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

function onSnippetDragEnd(evt: Sortable.SortableEvent) {
  const { oldIndex, newIndex, item, from } = evt
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
  // 撤销 sortable 对 DOM 的直接移动，交还给 Vue 根据数据重排，避免两者抢 DOM 所有权
  from.removeChild(item)
  from.insertBefore(item, from.children[oldIndex] ?? null)

  const arr = [...store.list]
  const [moved] = arr.splice(oldIndex, 1)
  if (!moved) return
  arr.splice(newIndex, 0, moved)
  store.reorder(arr.map(s => s.id))
}

watch(keyword, v => {
  sortableInstance?.option('disabled', v.trim() !== '')
})

let isDragging = false
let hasMoved = false
let dragStartX = 0
let dragStartY = 0

function onPanelHeaderMouseDown(e: MouseEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).tagName === 'BUTTON') return
  isDragging = true
  hasMoved = false
  dragStartX = e.screenX
  dragStartY = e.screenY
  document.body.style.pointerEvents = 'none'
  window.electronAPI.dragPanelStart()
  document.addEventListener('mousemove', onPanelMouseMove)
  document.addEventListener('mouseup', onPanelMouseUp)
}

function onPanelMouseMove(e: MouseEvent) {
  if (!isDragging) return
  const deltaX = e.screenX - dragStartX
  const deltaY = e.screenY - dragStartY
  if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) hasMoved = true
  window.electronAPI.dragPanel({ deltaX, deltaY })
  dragStartX = e.screenX
  dragStartY = e.screenY
}

function onPanelMouseUp() {
  if (isDragging) {
    document.body.style.pointerEvents = ''
    if (hasMoved) window.electronAPI.savePanelPosition()
  }
  isDragging = false
  document.removeEventListener('mousemove', onPanelMouseMove)
  document.removeEventListener('mouseup', onPanelMouseUp)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (quitModal.value.show) {
      quitModal.value.show = false
    } else if (editModal.value.show) {
      closeEditModal()
    } else {
      window.electronAPI.closePanel()
    }
  }
}

onMounted(() => {
  store.load()
  window.electronAPI.onRefreshSnippets(() => store.load())
  document.addEventListener('keydown', onKeydown)

  if (snippetListRef.value) {
    sortableInstance = Sortable.create(snippetListRef.value, {
      animation: 150,
      draggable: '.snippet-item',
      delay: 150,
      delayOnTouchOnly: true,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: onSnippetDragEnd
    })
  }
})

onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
})
</script>

<style scoped>
.container {
  width: 340px;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: move;
  padding: 4px 0;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.btn-icon {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-icon:hover { background: rgba(255, 255, 255, 0.2); }
.btn-close { font-size: 18px; }
.btn-close:hover { background: rgba(244, 67, 54, 0.3); }
.btn-settings {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}
.btn-settings:hover {
  background: rgba(102, 126, 234, 0.25);
  color: #fff;
}
.btn-quit {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}
.btn-quit:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #ff6b6b;
}
.search-box {
  position: relative;
  margin-bottom: 12px;
}
.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 13px;
  color: #fff;
  outline: none;
}
.search-input::placeholder { color: rgba(255, 255, 255, 0.4); }
.search-input:focus {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(102, 126, 234, 0.5);
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}
.snippet-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}
.snippet-list::-webkit-scrollbar { width: 4px; }
.snippet-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }
.snippet-item {
  padding: 12px 14px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  border: 1px solid transparent;
}
.snippet-item:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateX(4px);
}
.snippet-content {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-right: 50px;
}
.snippet-actions {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  gap: 4px;
}
.snippet-item:hover .snippet-actions { display: flex; }
.btn-action {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.btn-action.edit:hover { background: rgba(255, 193, 7, 0.3); }
.btn-action.delete:hover { background: rgba(244, 67, 54, 0.3); }

.snippet-item.sortable-chosen { transition: none; }
.snippet-item.sortable-ghost {
  opacity: 0.35;
  background: rgba(102, 126, 234, 0.2);
  border: 1px dashed rgba(102, 126, 234, 0.5);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
}
.modal {
  background: rgba(50, 54, 62, 0.98);
  padding: 20px;
  border-radius: 14px;
  width: 260px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}
.modal-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  line-height: 1.5;
}
.modal-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #fff;
  outline: none;
  background: rgba(255, 255, 255, 0.05);
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}
.modal-textarea::placeholder { color: rgba(255, 255, 255, 0.3); }
.modal-textarea:focus {
  border-color: rgba(102, 126, 234, 0.6);
  background: rgba(255, 255, 255, 0.08);
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.btn-modal {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-modal.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}
.btn-modal.cancel:hover { background: rgba(255, 255, 255, 0.15); }
.btn-modal.confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.btn-modal.confirm:hover { opacity: 0.9; }
.btn-modal.danger {
  background: rgba(244, 67, 54, 0.8);
  color: white;
}
.btn-modal.danger:hover { background: rgba(244, 67, 54, 1); }

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
}
.toast.show {
  display: block;
  animation: slideUp 1.5s ease;
}
@keyframes slideUp {
  0%, 100% { opacity: 0; transform: translate(-50%, 10px); }
  20%, 80% { opacity: 1; transform: translate(-50%, 0); }
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}
.empty-hint {
  margin-top: 4px;
  font-size: 12px;
}
</style>
