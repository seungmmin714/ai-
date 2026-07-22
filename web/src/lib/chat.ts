import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { ChatMessage } from '../types'

// 채팅방은 요청 1건당 하나(단체방): 요청자 + 수락된 봉사자 전원이 함께 쓴다.
// 메시지는 chats/{requestId}/messages 서브컬렉션에 저장.
function messagesRef(requestId: string) {
  return collection(db, 'chats', requestId, 'messages')
}

export function subscribeToMessages(
  requestId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(messagesRef(requestId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)),
    (error) => onError?.(error),
  )
}

export async function sendMessage(
  requestId: string,
  senderId: string,
  senderName: string,
  text: string,
) {
  await addDoc(messagesRef(requestId), {
    senderId,
    senderName,
    text,
    createdAt: Date.now(),
  })
}
