import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
        external: ['electron'],
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          ball: resolve(__dirname, 'src/preload/ball.ts'),
          panel: resolve(__dirname, 'src/preload/panel.ts'),
          settings: resolve(__dirname, 'src/preload/settings.ts')
        },
        external: ['electron'],
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [
      vue(),
      Components({
        resolvers: [NaiveUiResolver()],
        dts: 'src/renderer/components.d.ts'
      })
    ],
    build: {
      rollupOptions: {
        input: {
          ball: resolve(__dirname, 'src/renderer/ball/index.html'),
          panel: resolve(__dirname, 'src/renderer/panel/index.html'),
          settings: resolve(__dirname, 'src/renderer/settings/index.html')
        }
      }
    }
  }
})
