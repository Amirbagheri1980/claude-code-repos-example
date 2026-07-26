import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import EstimateDeck from './EstimateDeck'
import FacilitatorPanel from './FacilitatorPanel'
import { getChatState, type ChatStateResponse } from '../api'
import type { Session } from '../App'

interface MainPageProps {
  session: Session
  onLeave: () => void
}

const POLL_INTERVAL_MS = 2000

function MainPage({ session, onLeave }: MainPageProps) {
  const [chatState, setChatState] = useState<ChatStateResponse | null>(null)
  const { chatId, participantId } = session

  useEffect(() => {
    let cancelled = false

    async function poll() {
      const state = await getChatState(chatId, participantId)
      if (cancelled) {
        return
      }
      if (state === null) {
        onLeave()
        return
      }
      setChatState(state)
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [chatId, participantId, onLeave])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-dark-navy px-4 py-10 sm:px-8"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <Sidebar userName={session.name} role={session.role} />
        {session.role === 'Facilitator' ? (
          <FacilitatorPanel chatId={chatId} chatState={chatState} onClose={onLeave} />
        ) : (
          <EstimateDeck chatId={chatId} participantId={participantId} />
        )}
      </div>
    </motion.div>
  )
}

export default MainPage
