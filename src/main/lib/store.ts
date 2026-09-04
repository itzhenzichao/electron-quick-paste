import Store from 'electron-store'

export interface Snippet {
  id: number
  content: string
}

export interface StoreData {
  snippets: Snippet[]
  ballPosition: { x: number | null; y: number | null }
  panelPosition: { x: number | null; y: number | null }
}

const store = new Store<StoreData>({
  name: 'quick-paste-data',
  defaults: {
    snippets: [{ id: 1, content: '粘贴一下吧！' }],
    ballPosition: { x: null, y: null },
    panelPosition: { x: null, y: null }
  }
})

export function getStore() {
  return store
}
