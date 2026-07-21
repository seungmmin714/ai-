export type UserRole = 'recipient' | 'volunteer'
export type Gender = 'male' | 'female'

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: UserRole
  gender: Gender
  warmthScore: number
  createdAt: number
}

export type RequestCategory = 'labor' | 'digital' | 'errand' | 'safety'
export type EstimatedDuration = 'short' | 'medium' | 'long'
export type RequestStatus = 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled'

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  labor: '힘쓰는 일',
  digital: '스마트폰/PC',
  errand: '심부름',
  safety: '안전 확인',
}

export const DURATION_LABELS: Record<EstimatedDuration, string> = {
  short: '10분 내외',
  medium: '20분 정도',
  long: '30분 이상',
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
  location: { lat: number; lng: number }
  status: RequestStatus
  createdAt: number
}
