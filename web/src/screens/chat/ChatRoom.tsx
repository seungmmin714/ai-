import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Send, Users } from 'lucide-react'
import { sendMessage, subscribeToMessages } from '../../lib/chat'
import { subscribeToRequestMatches } from '../../lib/matches'
import { CATEGORY_LABELS, type ChatMessage, type Match } from '../../types'

export default function ChatRoom({
  match,
  currentUserId,
  currentUserName,
  onBack,
}: {
  match: Match
  currentUserId: string
  currentUserName: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [roomMatches, setRoomMatches] = useState<Match[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 단체방: 메시지·참여자 모두 요청(request) 단위
  useEffect(() => subscribeToMessages(match.requestId, setMessages), [match.requestId])
  useEffect(() => subscribeToRequestMatches(match.requestId, setRoomMatches), [match.requestId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 참여자 = 요청자 + 수락된 봉사자들
  const acceptedVolunteers = roomMatches.filter(
    (m) => m.status !== 'pending' && m.status !== 'reported',
  )
  const memberNames = [
    `${match.requesterName}(요청자)`,
    ...acceptedVolunteers.map((m) => m.volunteerName),
  ]

  async function handleSend() {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setText('')
    try {
      await sendMessage(match.requestId, currentUserId, currentUserName, value)
    } catch {
      setText(value) // 실패 시 입력 복원
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로"
          className="flex h-10 w-10 items-center justify-center"
        >
          <ChevronLeft />
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-bold">
            {CATEGORY_LABELS[match.category]} 채팅방
            <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-soft">
              <Users size={13} />
              {memberNames.length}
            </span>
          </p>
          <p className="truncate text-xs text-ink-soft">{memberNames.join(', ')}</p>
        </div>
      </div>

      <div className="flex flex-grow flex-col gap-2 overflow-y-auto p-4 no-scrollbar">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink-soft">
            아직 메시지가 없어요. 먼저 인사를 건네보세요.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && <p className="mb-0.5 px-1 text-xs text-ink-soft">{m.senderName}</p>}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-base ${
                  mine ? 'bg-primary text-white' : 'bg-surface-alt text-ink'
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
          placeholder="메시지를 입력하세요"
          className="min-h-12 flex-grow rounded-full border border-line bg-surface px-4 text-base"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          aria-label="보내기"
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-60"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
