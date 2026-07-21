import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HelpRequest, Match, UserProfile } from '../types'

const matchesRef = collection(db, 'matches')

// 봉사자가 요청에 참여 → 매칭 확정. 이미 매칭된 요청이면 트랜잭션에서 막는다.
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
      status: 'confirmed',
      createdAt: Date.now(),
    }
    tx.set(matchRef, newMatch)
    tx.update(requestRef, { status: 'matched' })
  })
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
