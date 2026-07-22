import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { uploadShopPhoto } from '../lib/photos'
import type { Gender, UserProfile } from '../types'

interface SignUpInput {
  name: string
  email: string
  password: string
  gender: Gender
  // 소상공인 가입 시에만 전달
  shopName?: string
  shopPhoto?: File
}

interface AuthContextValue {
  user: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  signUp: (input: SignUpInput) => Promise<void>
  logIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile: (() => void) | undefined
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      unsubProfile?.()
      unsubProfile = undefined
      if (firebaseUser) {
        unsubProfile = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
            setLoading(false)
          },
          () => setLoading(false),
        )
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => {
      unsubProfile?.()
      unsubAuth()
    }
  }, [])

  async function signUp({ name, email, password, gender, shopName, shopPhoto }: SignUpInput) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const uid = credential.user.uid
    let newProfile: UserProfile = {
      uid,
      name,
      email,
      // 통합 홈으로 역할 구분이 없어져 가입 시 선택하지 않는다 (기존 데이터 호환용 기본값)
      role: 'volunteer',
      gender,
      warmthScore: 36.5,
      createdAt: Date.now(),
    }
    if (shopName && shopPhoto) {
      // 가게 인증 사진: 현재는 아무 사진이든 등록 가능.
      // NOTE(추후 과제): 관리자가 사진을 검토해 verified를 승인하는 기능 도입 예정
      const photoUrl = await uploadShopPhoto(uid, shopPhoto)
      newProfile = {
        ...newProfile,
        accountType: 'shop',
        shopInfo: { shopName, photoUrl, verified: false },
      }
    }
    await setDoc(doc(db, 'users', uid), newProfile)
    setProfile(newProfile)
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logOut() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
