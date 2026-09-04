import { ipcMain } from 'electron'
import { getAutoLauncher } from '../lib/auto-launch'

export interface AutoLaunchResult {
  ok: boolean
  enabled: boolean
  error?: string
}

function fail(err: unknown): AutoLaunchResult {
  const msg = err instanceof Error ? err.message : String(err)
  return { ok: false, enabled: false, error: msg }
}

export function registerAutoLaunchIpc() {
  ipcMain.handle('get-auto-launch', async (): Promise<AutoLaunchResult> => {
    try {
      return { ok: true, enabled: await getAutoLauncher().isEnabled() }
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('set-auto-launch', async (_e, enabled: boolean): Promise<AutoLaunchResult> => {
    try {
      if (enabled) await getAutoLauncher().enable()
      else await getAutoLauncher().disable()
      return { ok: true, enabled: await getAutoLauncher().isEnabled() }
    } catch (err) {
      return fail(err)
    }
  })
}
