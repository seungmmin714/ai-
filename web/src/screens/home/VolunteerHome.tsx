import { useAuth } from '../../context/AuthContext'
import KakaoMap from '../../components/map/KakaoMap'

export default function VolunteerHome() {
  const { profile, logOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">여기잇다</h1>
          <p className="mt-1 text-sm text-ink-soft">{profile?.name}님, 봉사자 홈</p>
        </div>
        <button
          type="button"
          onClick={() => logOut()}
          className="min-h-12 rounded-full border border-line px-4 text-sm text-ink-soft"
        >
          로그아웃
        </button>
      </header>

      <div className="h-96 overflow-hidden rounded-2xl">
        <KakaoMap />
      </div>
    </div>
  )
}
