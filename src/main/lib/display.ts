import { screen, Display } from 'electron'

export function findDisplayContainingPoint(x: number, y: number): Display | null {
  const displays = screen.getAllDisplays()
  for (const d of displays) {
    if (x >= d.bounds.x && x < d.bounds.x + d.bounds.width &&
        y >= d.bounds.y && y < d.bounds.y + d.bounds.height) {
      return d
    }
  }
  return null
}

export function findNearestDisplay(x: number, y: number): Display {
  const displays = screen.getAllDisplays()
  let nearest = displays[0]
  let minDist = Infinity
  for (const d of displays) {
    const midX = d.bounds.x + d.bounds.width / 2
    const midY = d.bounds.y + d.bounds.height / 2
    const dist = (x - midX) ** 2 + (y - midY) ** 2
    if (dist < minDist) {
      minDist = dist
      nearest = d
    }
  }
  return nearest
}
