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
