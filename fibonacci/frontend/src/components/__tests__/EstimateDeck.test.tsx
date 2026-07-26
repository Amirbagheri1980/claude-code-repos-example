import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EstimateDeck from '../EstimateDeck'
import { setSelection } from '../../api'

vi.mock('../../api', () => ({
  setSelection: vi.fn().mockResolvedValue(undefined),
}))

const CHAT_ID = 'chat-1'
const PARTICIPANT_ID = 'participant-1'

describe('EstimateDeck', () => {
  it('renders every card in the Fibonacci sequence', () => {
    render(<EstimateDeck chatId={CHAT_ID} participantId={PARTICIPANT_ID} />)
    for (const value of ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕']) {
      expect(screen.getByRole('button', { name: value })).toBeInTheDocument()
    }
  })

  it('selects a card on click, shows it as the estimate, and calls the API', async () => {
    const user = userEvent.setup()
    render(<EstimateDeck chatId={CHAT_ID} participantId={PARTICIPANT_ID} />)

    const card = screen.getByRole('button', { name: '8' })
    await user.click(card)

    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/your estimate:/i)).toBeInTheDocument()
    expect(setSelection).toHaveBeenCalledWith(CHAT_ID, PARTICIPANT_ID, '8')
  })

  it('deselects a card when clicked again', async () => {
    const user = userEvent.setup()
    render(<EstimateDeck chatId={CHAT_ID} participantId={PARTICIPANT_ID} />)

    const card = screen.getByRole('button', { name: '5' })
    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'true')

    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('No estimate selected yet')).toBeInTheDocument()
    expect(setSelection).toHaveBeenLastCalledWith(CHAT_ID, PARTICIPANT_ID, null)
  })

  it('only allows one card to be selected at a time', async () => {
    const user = userEvent.setup()
    render(<EstimateDeck chatId={CHAT_ID} participantId={PARTICIPANT_ID} />)

    const cardFive = screen.getByRole('button', { name: '5' })
    const cardEight = screen.getByRole('button', { name: '8' })

    await user.click(cardFive)
    await user.click(cardEight)

    expect(cardFive).toHaveAttribute('aria-pressed', 'false')
    expect(cardEight).toHaveAttribute('aria-pressed', 'true')
  })
})
