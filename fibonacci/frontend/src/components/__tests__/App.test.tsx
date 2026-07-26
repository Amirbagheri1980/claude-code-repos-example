import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { joinChat, getChatState } from '../../api'

vi.mock('../../api', () => ({
  joinChat: vi.fn(),
  getChatState: vi.fn(),
  setSelection: vi.fn().mockResolvedValue(undefined),
  revealChat: vi.fn().mockResolvedValue(undefined),
  closeChat: vi.fn().mockResolvedValue(undefined),
}))

describe('App', () => {
  it('transitions from the landing page to the main page on submit', async () => {
    vi.mocked(joinChat).mockResolvedValue({
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
    expect(joinChat).toHaveBeenCalledWith('Ada Lovelace', 'User')
  })
})
