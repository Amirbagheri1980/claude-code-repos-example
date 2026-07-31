import { useState } from 'react'
import { revealChat, restartChat, closeChat, removeParticipant, type ChatStateResponse } from '../api'

interface FacilitatorPanelProps {
  chatId: string
  participantId: string
  chatState: ChatStateResponse | null
  onClose: () => void
}

function FacilitatorPanel({ chatId, participantId, chatState, onClose }: FacilitatorPanelProps) {
  const [copied, setCopied] = useState(false)
  const participants = chatState?.participants ?? []
  const revealed = chatState?.revealed ?? false
  const shareUrl = `${window.location.origin}/chat/${chatId}`

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

  function handleRemove(targetParticipantId: string) {
    void removeParticipant(chatId, targetParticipantId)
  }

  return (
    <section className="rounded-2xl bg-white/95 p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-blue-primary/20 bg-blue-primary/5 px-4 py-3">
        <label className="flex-1 text-xs font-medium tracking-wide text-gray-text uppercase">
          Room link
          <input
            type="text"
            readOnly
            value={shareUrl}
            aria-label="Room link"
            onFocus={(event) => event.target.select()}
            className="mt-1 block w-full rounded-lg border border-blue-primary/30 bg-white px-3 py-2 font-mono text-sm text-dark-navy"
          />
        </label>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-blue-primary px-3 py-2 text-sm font-semibold text-blue-primary"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

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
              className="flex items-center justify-between gap-3 rounded-lg border border-blue-primary/20 px-4 py-3"
            >
              <span className="font-medium text-dark-navy">{participant.name}</span>
              <div className="flex items-center gap-3">
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
                {participant.participantId !== participantId && (
                  <button
                    type="button"
                    onClick={() => handleRemove(participant.participantId)}
                    aria-label={`Remove ${participant.name}`}
                    className="text-sm font-semibold text-purple-secondary hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default FacilitatorPanel
