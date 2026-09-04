import { app } from 'electron'
import AutoLaunch from 'auto-launch'

let _autoLauncher: AutoLaunch | null = null

export function getAutoLauncher() {
  if (!_autoLauncher) {
    _autoLauncher = new AutoLaunch({
      name: 'NianYiTuo',
      path: app.getPath('exe')
    })
  }
  return _autoLauncher
}
