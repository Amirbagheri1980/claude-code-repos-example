import { revealChat, restartChat, closeChat, type ChatStateResponse } from '../api'

interface FacilitatorPanelProps {
  chatId: string
  chatState: ChatStateResponse | null
  onClose: () => void
}

function FacilitatorPanel({ chatId, chatState, onClose }: FacilitatorPanelProps) {
  const participants = chatState?.participants ?? []
  const revealed = chatState?.revealed ?? false

  function handleReveal() {
    void revealChat(chatId)
  }

  function handleRestart() {
    void restartChat(chatId)
  }

  async function handleClose() {
    await closeChat(chatId)
    onClose()
  }

  return (
    <section className="rounded-2xl bg-white/95 p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-dark-navy">Participants</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReveal}
            disabled={revealed}
            className="rounded-lg bg-blue-primary px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reveal
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-lg border border-blue-primary px-4 py-2 text-sm font-semibold text-blue-primary"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-purple-secondary px-4 py-2 text-sm font-semibold text-white"
          >
            Close Chat
          </button>
        </div>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-gray-text">Waiting for participants to join…</p>
      ) : (
        <ul className="space-y-3">
          {participants.map((participant) => (
            <li
              key={participant.participantId}
              className="flex items-center justify-between rounded-lg border border-blue-primary/20 px-4 py-3"
            >
              <span className="font-medium text-dark-navy">{participant.name}</span>
              <span
                className={`text-sm font-semibold ${
                  participant.hasSelected ? 'text-purple-secondary' : 'text-gray-text'
                }`}
              >
                {revealed
                  ? (participant.selection ?? '—')
                  : participant.hasSelected
                    ? 'Picked'
                    : 'Waiting…'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default FacilitatorPanel
