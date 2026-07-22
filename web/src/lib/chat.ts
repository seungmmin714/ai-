import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { ChatMessage } from '../types'

// 채팅방은 매칭 1건당 하나. 메시지는 matches/{matchId}/messages 서브컬렉션에 저장.
function messagesRef(matchId: string) {
  return collection(db, 'matches', matchId, 'messages')
}

export function subscribeToMessages(
  matchId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(messagesRef(matchId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)),
    (error) => onError?.(error),
  )
}

export async function sendMessage(
  matchId: string,
  senderId: string,
  senderName: string,
  text: string,
) {
  await addDoc(messagesRef(matchId), {
    senderId,
    senderName,
    text,
    createdAt: Date.now(),
  })
}
