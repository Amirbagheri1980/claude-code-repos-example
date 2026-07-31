interface RoomStatusProps {
  status: 'checking' | 'invalid'
}

function RoomStatus({ status }: RoomStatusProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-navy px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-8 text-center shadow-2xl">
        {status === 'checking' ? (
          <p className="text-dark-navy">Looking for this room…</p>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-dark-navy">Room not found</h1>
            <p className="mb-6 text-sm text-gray-text">
              This estimation room doesn't exist or has expired. Ask the facilitator for a new
              link, or start your own room.
            </p>
            <a
              href="/"
              className="inline-block rounded-lg bg-purple-secondary px-4 py-2 font-semibold text-white"
            >
              Start a new room
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default RoomStatus
