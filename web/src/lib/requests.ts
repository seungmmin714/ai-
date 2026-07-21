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
  type HelpRequest,
  type RequestCategory,
} from '../types'

const requestsRef = collection(db, 'helpRequests')

interface CreateHelpRequestInput {
  requesterId: string
  requesterName: string
  category: RequestCategory
  description: string
  estimatedDuration: EstimatedDuration
  location: { lat: number; lng: number }
}

export async function createHelpRequest(input: CreateHelpRequestInput) {
  const newRequest: Omit<HelpRequest, 'id'> = {
    requesterId: input.requesterId,
    requesterName: input.requesterName,
    title: `${CATEGORY_LABELS[input.category]} 도움`,
    description: input.description,
    category: input.category,
    estimatedDuration: input.estimatedDuration,
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
  callback: (requests: HelpRequest[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(requestsRef, where('status', '==', 'open'))
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HelpRequest))
    },
    (error) => onError?.(error),
  )
}

export async function cancelHelpRequest(requestId: string) {
  await updateDoc(doc(db, 'helpRequests', requestId), { status: 'cancelled' })
}
