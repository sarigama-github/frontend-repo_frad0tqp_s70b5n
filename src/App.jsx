import { useEffect, useMemo, useRef, useState } from 'react'

function useBackendUrl() {
  return useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])
}

function App() {
  const backend = useBackendUrl()
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [roomName, setRoomName] = useState('')
  const [currentRoom, setCurrentRoom] = useState(null)
  const [username, setUsername] = useState('')
  const [hasJoined, setHasJoined] = useState(false)

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true)
      const res = await fetch(`${backend}/api/rooms`)
      const data = await res.json()
      setRooms(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRooms(false)
    }
  }

  const createRoom = async (e) => {
    e.preventDefault()
    if (!roomName.trim()) return
    try {
      const res = await fetch(`${backend}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create room')
      const data = await res.json()
      setRoomName('')
      await fetchRooms()
      setCurrentRoom({ id: data.id, name: data.name })
    } catch (e) {
      alert(e.message)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 text-gray-800">
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">AnonChat</h1>
          <a href="/test" className="text-sm text-blue-600 hover:underline">Check backend</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {!hasJoined ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold mb-3">Choose a room</h2>
              <div className="space-y-3 max-h-72 overflow-auto pr-2">
                {loadingRooms ? (
                  <p className="text-sm text-gray-500">Loading rooms...</p>
                ) : rooms.length === 0 ? (
                  <p className="text-sm text-gray-500">No rooms yet. Create one below.</p>
                ) : (
                  rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setCurrentRoom(r)}
                      className={`w-full text-left px-3 py-2 rounded border hover:bg-gray-50 ${currentRoom?.id===r.id? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-gray-500">id: {r.id}</div>
                    </button>
                  ))
                )}
              </div>

              <form onSubmit={createRoom} className="mt-4 flex gap-2">
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="New room name"
                  className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold mb-3">Pick a nickname</h2>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. BlueFox42"
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                disabled={!username.trim() || !currentRoom}
                onClick={() => setHasJoined(true)}
                className="mt-4 w-full px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50 hover:bg-emerald-700"
              >
                Join Chat
              </button>

              <p className="mt-3 text-xs text-gray-500">No login required. Your nickname is only used in this session.</p>
            </div>
          </div>
        ) : (
          <ChatRoomView backend={backend} room={currentRoom} username={username} onLeave={() => setHasJoined(false)} />
        )}
      </main>
    </div>
  )
}

function ChatRoomView({ backend, room, username, onLeave }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  const fetchMessages = async () => {
    if (!room) return
    try {
      const res = await fetch(`${backend}/api/messages?room_id=${room.id}&limit=100`)
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content) return
    try {
      setInput('')
      await fetch(`${backend}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room.id, username, content }),
      })
      await fetchMessages()
      scrollToBottom()
    } catch (e) {
      console.error(e)
    }
  }

  const scrollToBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    fetchMessages()
    const id = setInterval(fetchMessages, 2000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Room</div>
          <div className="font-semibold">{room?.name}</div>
        </div>
        <button onClick={onLeave} className="text-sm text-red-600 hover:underline">Leave</button>
      </div>

      <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <p className="text-sm text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet. Be the first to say hi!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${m.username===username ? 'ml-auto bg-emerald-100' : 'bg-white'}`}>
              <div className="text-xs text-gray-500 mb-0.5">{m.username}</div>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
          placeholder="Type a message"
          className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button onClick={sendMessage} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Send</button>
      </div>
    </div>
  )
}

export default App
