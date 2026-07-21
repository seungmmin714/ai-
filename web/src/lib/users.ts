import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { GuardianContact } from '../types'

// 보호자 연락처 등록/수정 — 미인증(verified:false) 상태로 저장
export async function saveGuardianContact(uid: string, name: string, phone: string) {
  const guardianContact: GuardianContact = { name, phone, verified: false }
  await updateDoc(doc(db, 'users', uid), { guardianContact })
}

// 보호자 연동 인증 완료 처리
export async function verifyGuardianContact(uid: string) {
  await updateDoc(doc(db, 'users', uid), { 'guardianContact.verified': true })
}
