import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Review, UserProfile } from '../types'

const reviewsRef = collection(db, 'reviews')

interface SubmitReviewInput {
  matchId: string
  fromUserId: string
  fromName: string
  toUserId: string
  rating: number
  comment: string
}

// 온기지수 반영: 별점 4~5 → +0.1, 1~2 → -0.1, 3 → 변화 없음
function warmthDelta(rating: number) {
  if (rating >= 4) return 0.1
  if (rating <= 2) return -0.1
  return 0
}

export async function submitReview(input: SubmitReviewInput) {
  const reviewRef = doc(reviewsRef)
  const userRef = doc(db, 'users', input.toUserId)
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef)
    const newReview: Omit<Review, 'id'> = {
      matchId: input.matchId,
      fromUserId: input.fromUserId,
      fromName: input.fromName,
      toUserId: input.toUserId,
      rating: input.rating,
      comment: input.comment,
      createdAt: Date.now(),
    }
    tx.set(reviewRef, newReview)
    if (userSnap.exists()) {
      const current = (userSnap.data() as UserProfile).warmthScore ?? 36.5
      const next = Math.round((current + warmthDelta(input.rating)) * 10) / 10
      tx.update(userRef, { warmthScore: next })
    }
  })
}

// 한 매칭에 달린 후기(양방향, 최대 2개)를 구독 — 내가 남겼는지/받았는지 판별용
export function subscribeToMatchReviews(
  matchId: string,
  callback: (reviews: Review[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(reviewsRef, where('matchId', '==', matchId))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)),
    (error) => onError?.(error),
  )
}

// 특정 사용자가 받은 후기 단건 조회 (지원자 카드용)
export async function getReviewsForUser(userId: string) {
  const snap = await getDocs(query(reviewsRef, where('toUserId', '==', userId)))
  const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)
  reviews.sort((a, b) => b.createdAt - a.createdAt)
  return reviews
}

// 특정 사용자가 받은 후기 목록 (프로필 표시용)
export function subscribeToReviewsForUser(
  userId: string,
  callback: (reviews: Review[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(reviewsRef, where('toUserId', '==', userId))
  return onSnapshot(
    q,
    (snap) => {
      const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)
      reviews.sort((a, b) => b.createdAt - a.createdAt)
      callback(reviews)
    },
    (error) => onError?.(error),
  )
}
