import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Snippet } from '../../../preload'

export const useSnippetsStore = defineStore('snippets', () => {
  const list = ref<Snippet[]>([])

  async function load() {
    list.value = await window.electronAPI.getSnippets()
  }

  async function add(content: string) {
    list.value = await window.electronAPI.addSnippet({ content })
  }

  async function update(id: number, content: string) {
    list.value = await window.electronAPI.updateSnippet({ id, content })
  }

  async function remove(id: number) {
    list.value = await window.electronAPI.deleteSnippet(id)
  }

  async function reorder(ids: number[]) {
    list.value = await window.electronAPI.reorderSnippets(ids)
  }

  return { list, load, add, update, remove, reorder }
})
