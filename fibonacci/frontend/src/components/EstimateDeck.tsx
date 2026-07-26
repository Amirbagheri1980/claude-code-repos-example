import { useState } from 'react'
import Card from './Card'
import { setSelection } from '../api'

const SEQUENCE = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕']

interface EstimateDeckProps {
  chatId: string
  participantId: string
}

function EstimateDeck({ chatId, participantId }: EstimateDeckProps) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(value: string) {
    const next = selected === value ? null : value
    setSelected(next)
    void setSelection(chatId, participantId, next)
  }

  return (
    <section className="rounded-2xl bg-white/95 p-6 shadow-xl sm:p-8">
      <h2 className="mb-1 text-xl font-semibold text-dark-navy">
        Estimate Deck
      </h2>
      <p className="mb-6 text-sm text-gray-text">
        Pick a card to cast your estimate.
      </p>
      <div
        role="group"
        aria-label="Estimate deck"
        className="flex flex-wrap gap-4"
      >
        {SEQUENCE.map((value) => (
          <Card
            key={value}
            value={value}
            selected={selected === value}
            onClick={() => handleSelect(value)}
          />
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-text" aria-live="polite">
        {selected ? (
          <>
            Your estimate:{' '}
            <span className="font-semibold text-purple-secondary">
              {selected}
            </span>
          </>
        ) : (
          'No estimate selected yet'
        )}
      </p>
    </section>
  )
}

export default EstimateDeck
