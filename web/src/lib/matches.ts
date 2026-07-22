import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HelpRequest, Match, UserProfile } from '../types'

const matchesRef = collection(db, 'matches')

// 모집 인원에 포함되는(수락된) 상태
function isAccepted(status: Match['status']) {
  return status === 'confirmed' || status === 'in_progress' || status === 'completed'
}

// 봉사자가 요청에 지원 → 수락 대기(pending).
// 요청은 계속 open으로 두어 여러 명이 지원할 수 있고, 요청자가 그중에서 선택한다.
export async function applyToRequest(request: HelpRequest, volunteer: UserProfile) {
  // 같은 요청에 중복 지원 방지
  const mySnap = await getDocs(query(matchesRef, where('volunteerId', '==', volunteer.uid)))
  if (mySnap.docs.some((d) => (d.data() as Match).requestId === request.id)) {
    throw new Error('이미 이 요청에 지원했어요.')
  }
  const matchRef = doc(matchesRef)
  const requestRef = doc(db, 'helpRequests', request.id)
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef)
    if (!reqSnap.exists() || (reqSnap.data() as HelpRequest).status !== 'open') {
      throw new Error('모집이 마감된 요청이에요.')
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
  })
  return matchRef.id
}

// 요청자가 지원을 수락 → 매칭 확정(채팅·QR 열림).
// 확정 인원이 모집 인원에 도달하면 요청을 모집 마감(matched) 처리한다.
export async function acceptMatch(matchId: string, requestId: string) {
  await updateDoc(doc(db, 'matches', matchId), { status: 'confirmed' })
  const [reqSnap, matchSnaps] = await Promise.all([
    getDoc(doc(db, 'helpRequests', requestId)),
    getDocs(query(matchesRef, where('requestId', '==', requestId))),
  ])
  if (!reqSnap.exists()) return
  const needed = (reqSnap.data() as HelpRequest).neededVolunteers ?? 1
  const accepted = matchSnaps.docs.filter((d) => isAccepted((d.data() as Match).status)).length
  if (accepted >= needed && (reqSnap.data() as HelpRequest).status === 'open') {
    await updateDoc(doc(db, 'helpRequests', requestId), { status: 'matched' })
  }
}

// 지원 거절(요청자) / 지원 취소(봉사자) → 지원 기록 삭제. 요청은 계속 열려 있다.
export async function declineMatch(matchId: string) {
  await deleteDoc(doc(db, 'matches', matchId))
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

// 봉사자가 도착해 요청자의 QR 스캔 → 도착 인증(체크인) 완료, 진행중
export async function checkInMatch(matchId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'in_progress',
    checkInAt: Date.now(),
  })
}

// 봉사 완료 → 매칭 완료 처리. 이 요청의 확정 봉사가 모두 끝났으면 요청도 완료 처리.
export async function completeMatch(matchId: string, requestId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'completed',
    checkOutAt: Date.now(),
  })
  const matchSnaps = await getDocs(query(matchesRef, where('requestId', '==', requestId)))
  const stillActive = matchSnaps.docs.some((d) => {
    const s = (d.data() as Match).status
    return s === 'confirmed' || s === 'in_progress'
  })
  if (!stillActive) {
    await updateDoc(doc(db, 'helpRequests', requestId), { status: 'completed' })
  }
}
