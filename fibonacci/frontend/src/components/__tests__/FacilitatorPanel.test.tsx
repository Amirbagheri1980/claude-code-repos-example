import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FacilitatorPanel from '../FacilitatorPanel'
import { revealChat, restartChat, closeChat, removeParticipant, type ChatStateResponse } from '../../api'

vi.mock('../../api', () => ({
  revealChat: vi.fn().mockResolvedValue(undefined),
  restartChat: vi.fn().mockResolvedValue(undefined),
  closeChat: vi.fn().mockResolvedValue(undefined),
  removeParticipant: vi.fn().mockResolvedValue(undefined),
}))

const CHAT_ID = 'chat-1'
const FACILITATOR_PARTICIPANT_ID = 'facilitator-1'

const chatState: ChatStateResponse = {
  revealed: false,
  participants: [
    {
      participantId: 'p1',
      name: 'Ada Lovelace',
      role: 'User',
      hasSelected: true,
      selection: null,
    },
    {
      participantId: 'p2',
      name: 'Grace Hopper',
      role: 'User',
      hasSelected: false,
      selection: null,
    },
  ],
}

describe('FacilitatorPanel', () => {
  it('shows waiting/picked status but hides values before reveal', () => {
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Picked')).toBeInTheDocument()
    expect(screen.getByText('Waiting…')).toBeInTheDocument()
  })

  it('shows an empty state when no participants have joined', () => {
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={{ revealed: false, participants: [] }}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/waiting for participants/i)).toBeInTheDocument()
  })

  it('calls revealChat when Reveal is clicked', async () => {
    const user = userEvent.setup()
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /reveal/i }))

    expect(revealChat).toHaveBeenCalledWith(CHAT_ID)
  })

  it('shows the actual selection once revealed', () => {
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={{
          revealed: true,
          participants: [
            { participantId: 'p1', name: 'Ada Lovelace', role: 'User', hasSelected: true, selection: '5' },
          ],
        }}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('calls restartChat when Restart is clicked', async () => {
    const user = userEvent.setup()
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /restart/i }))

    expect(restartChat).toHaveBeenCalledWith(CHAT_ID)
  })

  it('calls closeChat and onClose when Close Chat is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: /close chat/i }))

    expect(closeChat).toHaveBeenCalledWith(CHAT_ID)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows a copyable shareable room link', () => {
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByLabelText(/room link/i) as HTMLInputElement
    expect(input.value).toContain(`/chat/${CHAT_ID}`)
  })

  it('copies the room link to the clipboard when Copy link is clicked', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /copy link/i }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`/chat/${CHAT_ID}`))
  })

  it('shows a Remove button for other participants but not for the facilitator themselves', () => {
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId="p1"
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /remove ada lovelace/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove grace hopper/i })).toBeInTheDocument()
  })

  it('calls removeParticipant when a Remove button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <FacilitatorPanel
        chatId={CHAT_ID}
        participantId={FACILITATOR_PARTICIPANT_ID}
        chatState={chatState}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /remove ada lovelace/i }))

    expect(removeParticipant).toHaveBeenCalledWith(CHAT_ID, 'p1')
  })
})
