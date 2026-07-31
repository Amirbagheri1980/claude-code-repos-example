const ROOM_PATH_PATTERN = /^\/chat\/([^/]+)\/?$/

export function getRoomIdFromUrl(): string | null {
  const match = window.location.pathname.match(ROOM_PATH_PATTERN)
  return match ? match[1] : null
}

export function navigateToRoom(chatId: string): void {
  window.history.pushState(null, '', `/chat/${chatId}`)
}

export function navigateToRoot(): void {
  window.history.pushState(null, '', '/')
}
