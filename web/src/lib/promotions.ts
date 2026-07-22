import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Promotion } from '../types'

const promotionsRef = collection(db, 'promotions')

interface StartPromotionInput {
  shopId: string
  shopName: string
  benefit: string
  photoUrls: string[]
  location: { lat: number; lng: number }
}

// 사장님이 프로모션 시작 → 지도에 노출
export async function startPromotion(input: StartPromotionInput) {
  const newPromotion: Omit<Promotion, 'id'> = {
    shopId: input.shopId,
    shopName: input.shopName,
    benefit: input.benefit,
    photoUrls: input.photoUrls,
    location: input.location,
    status: 'active',
    createdAt: Date.now(),
  }
  await addDoc(promotionsRef, newPromotion)
}

export async function endPromotion(promotionId: string) {
  await updateDoc(doc(db, 'promotions', promotionId), {
    status: 'ended',
    endedAt: Date.now(),
  })
}

// 지도·목록에 보여줄 진행 중 프로모션 전체
export function subscribeToActivePromotions(
  callback: (promotions: Promotion[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(promotionsRef, where('status', '==', 'active'))
  return onSnapshot(
    q,
    (snap) => {
      const promotions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion)
      promotions.sort((a, b) => b.createdAt - a.createdAt)
      callback(promotions)
    },
    (error) => onError?.(error),
  )
}

// 내 가게 프로모션 (마이페이지 관리용)
export function subscribeToShopPromotions(
  shopId: string,
  callback: (promotions: Promotion[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(promotionsRef, where('shopId', '==', shopId))
  return onSnapshot(
    q,
    (snap) => {
      const promotions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion)
      promotions.sort((a, b) => b.createdAt - a.createdAt)
      callback(promotions)
    },
    (error) => onError?.(error),
  )
}
