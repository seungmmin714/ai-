import { useEffect, useState } from 'react'
import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { Dumbbell, ShieldCheck, ShoppingBag, Smartphone, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import KakaoMap from '../../components/map/KakaoMap'
import { subscribeToOpenRequests } from '../../lib/requests'
import {
  CATEGORY_LABELS,
  DURATION_LABELS,
  FREQUENCY_LABELS,
  type HelpRequest,
  type RequestCategory,
} from '../../types'

const CATEGORY_ICON: Record<RequestCategory, typeof Dumbbell> = {
  labor: Dumbbell,
  digital: Smartphone,
  errand: ShoppingBag,
  safety: ShieldCheck,
}

const CATEGORY_PIN_CLASS: Record<RequestCategory, string> = {
  labor: 'bg-primary',
  digital: 'bg-info',
  errand: 'bg-green',
  safety: 'bg-danger',
}

export default function VolunteerHome() {
  const { profile, logOut } = useAuth()
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [selected, setSelected] = useState<HelpRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const gender = profile?.gender
    if (!gender) return
    return subscribeToOpenRequests(gender, setRequests, (error) => setLoadError(error.message))
  }, [profile?.gender])

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
        <KakaoMap>
          {requests.map((r) => {
            const Icon = CATEGORY_ICON[r.category]
            return (
              <CustomOverlayMap key={r.id} position={r.location} clickable yAnchor={1}>
                <div className="flex flex-col items-center">
                  {r.frequency === 'recurring' && (
                    <span className="mb-1 rounded-full bg-star px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
                      자주
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md ${CATEGORY_PIN_CLASS[r.category]}`}
                  >
                    <Icon size={18} />
                  </button>
                </div>
              </CustomOverlayMap>
            )
          })}
        </KakaoMap>
      </div>

      {loadError && (
        <p className="rounded-2xl bg-danger-tint px-4 py-3 text-base text-danger">
          목록을 불러오지 못했습니다: {loadError}
        </p>
      )}

      {requests.length === 0 && (
        <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
          주변에 등록된 요청이 없어요.
        </p>
      )}

      {selected && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{CATEGORY_LABELS[selected.category]}</span>
                <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-semibold text-primary">
                  {FREQUENCY_LABELS[selected.frequency]}
                </span>
              </div>
              <p className="text-sm text-ink-soft">{selected.requesterName}님 · 예상 {DURATION_LABELS[selected.estimatedDuration]}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="min-h-12 min-w-12">
              <X size={20} />
            </button>
          </div>
          <p className="mt-2 text-base">{selected.description}</p>
        </div>
      )}
    </div>
  )
}
