import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HelpRequest, Match, UserProfile } from '../types'

const matchesRef = collection(db, 'matches')

// 봉사자가 요청에 참여 신청 → 수락 대기(pending). 요청은 예약(matched)해 다른 신청을 막는다.
export async function applyToRequest(request: HelpRequest, volunteer: UserProfile) {
  const matchRef = doc(matchesRef)
  const requestRef = doc(db, 'helpRequests', request.id)
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef)
    if (!reqSnap.exists() || (reqSnap.data() as HelpRequest).status !== 'open') {
      throw new Error('이미 다른 봉사자와 매칭된 요청이에요.')
    }
    const newMatch: Omit<Match, 'id'> = {
      requestId: request.id,
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      volunteerId: volunteer.uid,
      volunteerName: volunteer.name,
      category: request.category,
      qrCode: crypto.randomUUID(),
      status: 'pending',
      createdAt: Date.now(),
    }
    tx.set(matchRef, newMatch)
    tx.update(requestRef, { status: 'matched' })
  })
  return matchRef.id
}

// 요청자가 참여 신청을 수락 → 매칭 확정(채팅·QR 열림)
export async function acceptMatch(matchId: string) {
  await updateDoc(doc(db, 'matches', matchId), { status: 'confirmed' })
}

// 참여 신청 거절(요청자) / 신청 취소(봉사자) → 매칭 삭제하고 요청을 다시 열어둔다
export async function declineMatch(matchId: string, requestId: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'matches', matchId))
  batch.update(doc(db, 'helpRequests', requestId), { status: 'open' })
  await batch.commit()
}

function subscribeToMatchesByField(
  field: 'volunteerId' | 'requesterId',
  uid: string,
  callback: (matches: Match[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(matchesRef, where(field, '==', uid))
  return onSnapshot(
    q,
    (snap) => {
      const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match)
      matches.sort((a, b) => b.createdAt - a.createdAt)
      callback(matches)
    },
    (error) => onError?.(error),
  )
}

export function subscribeToVolunteerMatches(
  volunteerId: string,
  callback: (matches: Match[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeToMatchesByField('volunteerId', volunteerId, callback, onError)
}

export function subscribeToRequesterMatches(
  requesterId: string,
  callback: (matches: Match[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeToMatchesByField('requesterId', requesterId, callback, onError)
}

// 봉사자가 도착해 QR 스캔 → 진행중
export async function checkInMatch(matchId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'in_progress',
    checkInAt: Date.now(),
  })
}

// 봉사 완료 → 매칭·요청 모두 완료 처리
export async function completeMatch(matchId: string, requestId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'completed',
    checkOutAt: Date.now(),
  })
  await updateDoc(doc(db, 'helpRequests', requestId), { status: 'completed' })
}
