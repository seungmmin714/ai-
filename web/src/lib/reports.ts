import { collection, doc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { Report, ReportReason } from '../types'

interface SubmitReportInput {
  matchId: string
  reporterId: string
  reason: ReportReason
  detail: string
}

export async function submitReport(input: SubmitReportInput) {
  const batch = writeBatch(db)
  const reportRef = doc(collection(db, 'reports'))
  const newReport: Omit<Report, 'id'> = {
    matchId: input.matchId,
    reporterId: input.reporterId,
    reason: input.reason,
    detail: input.detail,
    status: 'pending',
    createdAt: Date.now(),
  }
  batch.set(reportRef, newReport)
  // 신고 접수 시 해당 매칭 상태를 '일시중지(reported)'로 변경
  batch.update(doc(db, 'matches', input.matchId), { status: 'reported' })
  await batch.commit()
  // NOTE(추후 과제): 관리자가 신고를 '확정(resolved)'하면 피신고자 온기지수 -0.5 적용.
  // 관리자 대시보드/권한 체계는 이번 MVP 범위 밖이라 확정·감점 로직은 구현하지 않음.
}
