import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MainPage from '../MainPage'
import { getChatState } from '../../api'
import type { Session } from '../../App'

vi.mock('../../api', () => ({
  getChatState: vi.fn(),
  setSelection: vi.fn().mockResolvedValue(undefined),
  revealChat: vi.fn().mockResolvedValue(undefined),
  restartChat: vi.fn().mockResolvedValue(undefined),
  closeChat: vi.fn().mockResolvedValue(undefined),
  removeParticipant: vi.fn().mockResolvedValue(undefined),
}))

const baseSession: Session = {
  chatId: 'chat-1',
  participantId: 'p1',
  name: 'Ada Lovelace',
  role: 'User',
}

const selfAsParticipant = {
  participantId: 'p1',
  name: 'Ada Lovelace',
  role: 'User' as const,
  hasSelected: false,
  selection: null,
}

describe('MainPage', () => {
  it('renders the sidebar and the estimate deck for a User', async () => {
    vi.mocked(getChatState).mockResolvedValue({ revealed: false, participants: [selfAsParticipant] })
    render(<MainPage session={baseSession} onLeave={vi.fn()} />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: /estimate deck/i }),
    ).toBeInTheDocument()
  })

  it('renders the facilitator panel for a Facilitator', async () => {
    vi.mocked(getChatState).mockResolvedValue({
      revealed: false,
      participants: [{ ...selfAsParticipant, role: 'Facilitator' }],
    })
    render(<MainPage session={{ ...baseSession, role: 'Facilitator' }} onLeave={vi.fn()} />)

    expect(
      await screen.findByRole('heading', { name: /participants/i }),
    ).toBeInTheDocument()
  })

  it('calls onLeave when the chat has been closed (404)', async () => {
    vi.mocked(getChatState).mockResolvedValue(null)
    const onLeave = vi.fn()
    render(<MainPage session={baseSession} onLeave={onLeave} />)

    await waitFor(() => expect(onLeave).toHaveBeenCalled())
  })

  it('calls onLeave when the participant has been removed from the room', async () => {
    vi.mocked(getChatState).mockResolvedValue({ revealed: false, participants: [] })
    const onLeave = vi.fn()
    render(<MainPage session={baseSession} onLeave={onLeave} />)

    await waitFor(() => expect(onLeave).toHaveBeenCalled())
  })
})
