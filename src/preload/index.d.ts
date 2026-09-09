export interface Snippet {
  id: number
  content: string
}

export interface AutoLaunchResult {
  ok: boolean
  enabled: boolean
  error?: string
}

export interface DataExportResult {
  ok: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

export interface DataImportResult {
  ok: boolean
  count?: number
  mode?: string
  canceled?: boolean
  error?: string
}

export interface BallPosition {
  x: number
  y: number
}

export interface JumpScale {
  scaleX: number
  scaleY: number
}

export interface PanelDragDelta {
  deltaX: number
  deltaY: number
}

export interface ElectronAPI {
  getSnippets: () => Promise<Snippet[]>
  addSnippet: (snippet: { content: string }) => Promise<Snippet[]>
  updateSnippet: (snippet: Snippet) => Promise<Snippet[]>
  deleteSnippet: (id: number) => Promise<Snippet[]>
  reorderSnippets: (ids: number[]) => Promise<Snippet[]>
  copyToClipboard: (text: string) => Promise<boolean>
  getAutoLaunch: () => Promise<AutoLaunchResult>
  setAutoLaunch: (enabled: boolean) => Promise<AutoLaunchResult>
  exportData: () => Promise<DataExportResult>
  importData: (mode: 'merge' | 'replace') => Promise<DataImportResult>
  getPlatform: () => NodeJS.Platform
  getScreenSize: () => Promise<{ width: number; height: number }>
  getWindowPosition: () => Promise<BallPosition>
  dragStart: () => Promise<BallPosition>
  dragBall: (pos: BallPosition) => void
  saveBallPosition: () => void
  dragPanelStart: () => void
  dragPanel: (delta: PanelDragDelta) => void
  savePanelPosition: () => void
  togglePanel: () => void
  closePanel: () => void
  openSettings: () => void
  closeSettings: () => void
  pauseJump: () => void
  resumeJump: () => void
  quitApp: () => void
  onJumpScale: (callback: (data: JumpScale) => void) => void
  onRefreshSnippets: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
