import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ParticipantRole } from '../api'

interface LandingPageProps {
  onSubmit: (name: string, role: ParticipantRole) => void
}

function LandingPage({ onSubmit }: LandingPageProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<ParticipantRole>('Facilitator')
  const trimmed = name.trim()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (trimmed) {
      onSubmit(trimmed, role)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-navy px-4">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white/95 p-8 text-center shadow-2xl"
      >
        <h1 className="mb-2 text-2xl font-bold text-dark-navy">
          Fibonacci Estimation
        </h1>
        <p className="mb-6 text-sm text-gray-text">
          Enter your name to join the estimation deck.
        </p>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="mb-4 w-full rounded-lg border-2 border-blue-primary/40 px-4 py-2 text-dark-navy outline-none focus:border-blue-primary"
        />
        <fieldset className="mb-6 flex justify-center gap-6">
          <legend className="sr-only">Role</legend>
          {(['Facilitator', 'User'] as const).map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 text-sm text-dark-navy"
            >
              <input
                type="radio"
                name="role"
                value={option}
                checked={role === option}
                onChange={() => setRole(option)}
                className="accent-purple-secondary"
              />
              {option}
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          disabled={!trimmed}
          className="w-full rounded-lg bg-purple-secondary px-4 py-2 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enter
        </button>
      </motion.form>
    </div>
  )
}

export default LandingPage
