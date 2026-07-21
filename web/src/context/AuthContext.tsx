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
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { Gender, UserProfile, UserRole } from '../types'

interface SignUpInput {
  name: string
  email: string
  password: string
  role: UserRole
  gender: Gender
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
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  async function signUp({ name, email, password, role, gender }: SignUpInput) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const newProfile: UserProfile = {
      uid: credential.user.uid,
      name,
      email,
      role,
      gender,
      warmthScore: 36.5,
      createdAt: Date.now(),
    }
    await setDoc(doc(db, 'users', credential.user.uid), newProfile)
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
