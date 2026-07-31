import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { createRoom, joinRoom, getChatState } from '../../api'

vi.mock('../../api', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  getChatState: vi.fn(),
  setSelection: vi.fn().mockResolvedValue(undefined),
  revealChat: vi.fn().mockResolvedValue(undefined),
  closeChat: vi.fn().mockResolvedValue(undefined),
}))

afterEach(() => {
  window.history.pushState(null, '', '/')
})

describe('App', () => {
  it('creates a new room and transitions to the main page when there is no room in the URL', async () => {
    vi.mocked(createRoom).mockResolvedValue({
      chatId: 'chat-1',
      participantId: 'p1',
      role: 'User',
    })
    vi.mocked(getChatState).mockResolvedValue({ revealed: false, participants: [] })

    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /fibonacci estimation/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'User' }))
    await user.type(screen.getByLabelText(/your name/i), 'Ada Lovelace')
    await user.click(screen.getByRole('button', { name: /enter/i }))

    expect(
      await screen.findByRole('heading', { name: /estimate deck/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(createRoom).toHaveBeenCalledWith('Ada Lovelace', 'User')
    expect(window.location.pathname).toBe('/chat/chat-1')
  })

  it('shows the join form for a valid room found via the URL, and joins it', async () => {
    window.history.pushState(null, '', '/chat/ABC234')
    vi.mocked(getChatState).mockResolvedValue({ revealed: false, participants: [] })
    vi.mocked(joinRoom).mockResolvedValue({
      chatId: 'ABC234',
      participantId: 'p2',
      role: 'Facilitator',
    })

    const user = userEvent.setup()
    render(<App />)

    await user.type(await screen.findByLabelText(/your name/i), 'Grace Hopper')
    await user.click(screen.getByRole('button', { name: /enter/i }))

    expect(
      await screen.findByRole('heading', { name: /participants/i }),
    ).toBeInTheDocument()
    expect(joinRoom).toHaveBeenCalledWith('ABC234', 'Grace Hopper', 'Facilitator')
  })

  it('shows a friendly error for an invalid/expired room in the URL', async () => {
    window.history.pushState(null, '', '/chat/NOPE99')
    vi.mocked(getChatState).mockResolvedValue(null)

    render(<App />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /room not found/i })).toBeInTheDocument(),
    )
  })
})
