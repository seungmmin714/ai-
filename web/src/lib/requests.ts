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
import {
  CATEGORY_LABELS,
  type EstimatedDuration,
  type Gender,
  type HelpRequest,
  type RequestCategory,
  type RequestFrequency,
} from '../types'

const requestsRef = collection(db, 'helpRequests')

interface CreateHelpRequestInput {
  requesterId: string
  requesterName: string
  requesterGender: Gender
  category: RequestCategory
  description: string
  estimatedDuration: EstimatedDuration
  frequency: RequestFrequency
  sameGenderOnly: boolean
  neededVolunteers: number
  photoUrls: string[]
  location: { lat: number; lng: number }
}

export async function createHelpRequest(input: CreateHelpRequestInput) {
  const newRequest: Omit<HelpRequest, 'id'> = {
    requesterId: input.requesterId,
    requesterName: input.requesterName,
    requesterGender: input.requesterGender,
    title: `${CATEGORY_LABELS[input.category]} 도움`,
    description: input.description,
    category: input.category,
    estimatedDuration: input.estimatedDuration,
    frequency: input.frequency,
    sameGenderOnly: input.sameGenderOnly,
    neededVolunteers: input.neededVolunteers,
    photoUrls: input.photoUrls,
    location: input.location,
    status: 'open',
    createdAt: Date.now(),
  }
  await addDoc(requestsRef, newRequest)
}

export function subscribeToMyRequests(
  uid: string,
  callback: (requests: HelpRequest[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(requestsRef, where('requesterId', '==', uid))
  return onSnapshot(
    q,
    (snap) => {
      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HelpRequest)
      requests.sort((a, b) => b.createdAt - a.createdAt)
      callback(requests)
    },
    (error) => onError?.(error),
  )
}

export function subscribeToOpenRequests(
  viewerGender: Gender,
  callback: (requests: HelpRequest[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(requestsRef, where('status', '==', 'open'))
  return onSnapshot(
    q,
    (snap) => {
      const requests = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as HelpRequest)
        // 동성 매칭 옵션: 다른 성별 봉사자에게는 해당 요청을 숨긴다
        .filter((r) => !r.sameGenderOnly || r.requesterGender === viewerGender)
      callback(requests)
    },
    (error) => onError?.(error),
  )
}

export async function cancelHelpRequest(requestId: string) {
  await updateDoc(doc(db, 'helpRequests', requestId), { status: 'cancelled' })
}
