import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './components/LandingPage'
import MainPage from './components/MainPage'
import RoomStatus from './components/RoomStatus'
import { createRoom, joinRoom, getChatState, type ParticipantRole } from './api'
import { getRoomIdFromUrl, navigateToRoom, navigateToRoot } from './routing'

export interface Session {
  chatId: string
  participantId: string
  name: string
  role: ParticipantRole
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [roomId, setRoomId] = useState<string | null>(() => getRoomIdFromUrl())
  const [roomValidity, setRoomValidity] = useState<'checking' | 'valid' | 'invalid'>(() =>
    roomId ? 'checking' : 'valid',
  )

  useEffect(() => {
    if (!roomId) {
      return
    }
    let cancelled = false
    getChatState(roomId).then((state) => {
      if (!cancelled) {
        setRoomValidity(state ? 'valid' : 'invalid')
      }
    })
    return () => {
      cancelled = true
    }
  }, [roomId])

  async function handleCreateRoom(name: string, role: ParticipantRole) {
    const { chatId, participantId } = await createRoom(name, role)
    navigateToRoom(chatId)
    setSession({ chatId, participantId, name, role })
  }

  async function handleJoinRoom(name: string) {
    if (!roomId) {
      return
    }
    try {
      const { chatId, participantId, role } = await joinRoom(roomId, name)
      setSession({ chatId, participantId, name, role })
    } catch {
      setRoomValidity('invalid')
    }
  }

  function handleLeave() {
    setSession(null)
    navigateToRoot()
    setRoomId(null)
    setRoomValidity('valid')
  }

  return (
    <AnimatePresence mode="wait">
      {session ? (
        <MainPage key="main" session={session} onLeave={handleLeave} />
      ) : roomValidity === 'checking' ? (
        <RoomStatus key="checking" status="checking" />
      ) : roomValidity === 'invalid' ? (
        <RoomStatus key="invalid" status="invalid" />
      ) : (
        <LandingPage
          key="landing"
          onSubmit={roomId ? handleJoinRoom : handleCreateRoom}
          allowRoleSelection={!roomId}
        />
      )}
    </AnimatePresence>
  )
}

export default App
