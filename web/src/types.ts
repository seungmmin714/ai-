export type UserRole = 'recipient' | 'volunteer'
export type Gender = 'male' | 'female'

export interface GuardianContact {
  name: string
  phone: string
  verified: boolean
}

// 소상공인(가게) 계정 정보
export interface ShopInfo {
  shopName: string
  photoUrl: string // 가게 인증 사진 (현재는 아무 사진이나 허용)
  verified: boolean // NOTE(추후 과제): 관리자가 사진을 확인하고 승인하는 기능 도입 예정
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: UserRole
  gender: Gender
  warmthScore: number
  guardianContact?: GuardianContact
  accountType?: 'personal' | 'shop' // 없으면 personal
  shopInfo?: ShopInfo
  createdAt: number
}

// 온기지수 배지 색상 구간: 36.5 미만 회색 / 36.5~37.5 초록 / 37.5 이상 주황
export type WarmthTier = 'cold' | 'warm' | 'hot'

export function warmthTier(score: number): WarmthTier {
  if (score < 36.5) return 'cold'
  if (score < 37.5) return 'warm'
  return 'hot'
}

export type RequestCategory =
  | 'labor'
  | 'digital'
  | 'errand'
  | 'housework'
  | 'companion'
  | 'repair'
  | 'safety'
  | 'other'
export type EstimatedDuration = 'short' | 'medium' | 'long'
export type RequestFrequency = 'once' | 'recurring'
export type RequestStatus = 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled'

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  labor: '힘쓰는 일',
  digital: '스마트폰/PC',
  errand: '심부름',
  housework: '집안일',
  companion: '말벗·동행',
  repair: '간단 수리',
  safety: '안전 확인',
  other: '기타',
}

export const DURATION_LABELS: Record<EstimatedDuration, string> = {
  short: '10분 내외',
  medium: '20분 정도',
  long: '30분 이상',
}

export const FREQUENCY_LABELS: Record<RequestFrequency, string> = {
  once: '한 번만',
  recurring: '자주 필요',
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: '대기 중',
  matched: '매칭됨',
  in_progress: '진행 중',
  completed: '완료',
  cancelled: '취소됨',
}

export interface HelpRequest {
  id: string
  requesterId: string
  requesterName: string
  title: string
  description: string
  category: RequestCategory
  estimatedDuration: EstimatedDuration
  frequency: RequestFrequency
  sameGenderOnly: boolean
  requesterGender: Gender
  neededVolunteers: number // 모집 인원 (기존 문서에는 없을 수 있어 사용처에서 ?? 1 처리)
  photoUrls: string[] // 현장 사진 (기존 문서에는 없을 수 있어 사용처에서 ?? [] 처리)
  location: { lat: number; lng: number }
  status: RequestStatus
  createdAt: number
}

export type MatchStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'reported'

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: '수락 대기',
  confirmed: '매칭 완료',
  in_progress: '진행 중',
  completed: '봉사 완료',
  reported: '일시중지',
}

export interface Match {
  id: string
  requestId: string
  requesterId: string
  requesterName: string
  volunteerId: string
  volunteerName: string
  category: RequestCategory
  qrCode: string
  status: MatchStatus
  checkInAt?: number
  checkOutAt?: number
  createdAt: number
}

export interface Review {
  id: string
  matchId: string
  fromUserId: string
  fromName: string
  toUserId: string
  rating: number // 1~5
  comment: string
  createdAt: number
}

// 지역 상점 프로모션: 사장님이 비피크 시간대에 시작하면 지도에 노출되고,
// 봉사를 완료(QR 인증)한 이웃이 가게에서 혜택을 받는다.
export interface Promotion {
  id: string
  shopId: string
  shopName: string
  benefit: string // 예: "아메리카노 500원 할인", "사이드 메뉴 증정"
  location: { lat: number; lng: number }
  status: 'active' | 'ended'
  createdAt: number
  endedAt?: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  createdAt: number
}

export type ReportReason = 'no_show' | 'inappropriate' | 'money_request' | 'safety' | 'other'

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  no_show: '노쇼(약속 불이행)',
  inappropriate: '부적절한 언행',
  money_request: '금전 요구',
  safety: '안전 문제',
  other: '기타',
}

export interface Report {
  id: string
  matchId: string
  reporterId: string
  reason: ReportReason
  detail: string
  status: 'pending' | 'resolved'
  createdAt: number
}
