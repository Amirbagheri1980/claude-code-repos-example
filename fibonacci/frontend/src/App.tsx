import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './components/LandingPage'
import MainPage from './components/MainPage'
import { joinChat, type ParticipantRole } from './api'

export interface Session {
  chatId: string
  participantId: string
  name: string
  role: ParticipantRole
}

function App() {
  const [session, setSession] = useState<Session | null>(null)

  async function handleJoin(name: string, role: ParticipantRole) {
    const { chatId, participantId } = await joinChat(name, role)
    setSession({ chatId, participantId, name, role })
  }

  function handleLeave() {
    setSession(null)
  }

  return (
    <AnimatePresence mode="wait">
      {session ? (
        <MainPage key="main" session={session} onLeave={handleLeave} />
      ) : (
        <LandingPage key="landing" onSubmit={handleJoin} />
      )}
    </AnimatePresence>
  )
}

export default App
