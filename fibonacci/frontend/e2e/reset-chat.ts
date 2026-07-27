import type { APIRequestContext } from '@playwright/test'

const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

// The app keeps a single global active chat (no rooms/join-codes), so tests
// must close it before each run or they leak participants into each other.
export async function resetActiveChat(request: APIRequestContext) {
  const joinResponse = await request.post(`${API_BASE_URL}/api/chats/join`, {
    data: { name: 'e2e-cleanup', role: 'Facilitator' },
  })
  const { chatId } = await joinResponse.json()
  await request.post(`${API_BASE_URL}/api/chats/${chatId}/close`)
}
