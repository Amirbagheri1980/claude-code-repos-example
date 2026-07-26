export type ParticipantRole = 'User' | 'Facilitator'

export interface JoinResponse {
  chatId: string
  participantId: string
  role: ParticipantRole
}

export interface ParticipantDto {
  participantId: string
  name: string
  role: ParticipantRole
  hasSelected: boolean
  selection: string | null
}

export interface ChatStateResponse {
  revealed: boolean
  participants: ParticipantDto[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    throw new Error(`Request to ${path} failed: ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export function joinChat(name: string, role: ParticipantRole): Promise<JoinResponse> {
  return request<JoinResponse>('/api/chats/join', {
    method: 'POST',
    body: JSON.stringify({ name, role }),
  })
}

export async function getChatState(
  chatId: string,
  participantId: string,
): Promise<ChatStateResponse | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/chats/${chatId}?participantId=${participantId}`,
  )
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Request to get chat state failed: ${response.status}`)
  }
  return (await response.json()) as ChatStateResponse
}

export function setSelection(
  chatId: string,
  participantId: string,
  value: string | null,
): Promise<void> {
  return request<void>(`/api/chats/${chatId}/participants/${participantId}/selection`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export function revealChat(chatId: string): Promise<void> {
  return request<void>(`/api/chats/${chatId}/reveal`, { method: 'POST' })
}

export function closeChat(chatId: string): Promise<void> {
  return request<void>(`/api/chats/${chatId}/close`, { method: 'POST' })
}
