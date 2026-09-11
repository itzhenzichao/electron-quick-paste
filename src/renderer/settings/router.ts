import { createRouter, createMemoryHistory } from 'vue-router'
import AutoLaunch from './pages/AutoLaunch.vue'
import DataManage from './pages/DataManage.vue'
import Version from './pages/Version.vue'

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: '/auto-launch' },
    { path: '/auto-launch', name: 'auto-launch', component: AutoLaunch },
    { path: '/data', name: 'data', component: DataManage },
    { path: '/version', name: 'version', component: Version }
  ]
})
