import { useEffect, useState } from 'react'
import { MapMarker } from 'react-kakao-maps-sdk'
import { Dumbbell, MapPin, ShieldCheck, ShoppingBag, Smartphone, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { createHelpRequest } from '../../lib/requests'
import KakaoMap from '../../components/map/KakaoMap'
import {
  DURATION_LABELS,
  type EstimatedDuration,
  type RequestCategory,
  type RequestFrequency,
} from '../../types'

const DEFAULT_LOCATION = { lat: 37.5636, lng: 126.9251 } // 연남동

const CATEGORY_OPTIONS: { value: RequestCategory; label: string; icon: typeof Dumbbell }[] = [
  { value: 'labor', label: '힘쓰는 일', icon: Dumbbell },
  { value: 'digital', label: '스마트폰/PC', icon: Smartphone },
  { value: 'errand', label: '심부름', icon: ShoppingBag },
  { value: 'safety', label: '안전 확인', icon: ShieldCheck },
]

const DURATION_OPTIONS: EstimatedDuration[] = ['short', 'medium', 'long']

const FREQUENCY_OPTIONS: { value: RequestFrequency; label: string }[] = [
  { value: 'once', label: '한 번만 필요해요' },
  { value: 'recurring', label: '자주 필요해요' },
]

export default function RequestFormModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth()
  const [category, setCategory] = useState<RequestCategory | null>(null)
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState<EstimatedDuration>('medium')
  const [frequency, setFrequency] = useState<RequestFrequency>('once')
  const [sameGenderOnly, setSameGenderOnly] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(DEFAULT_LOCATION)
      setLocationDenied(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setLocation(DEFAULT_LOCATION)
        setLocationDenied(true)
      },
      { timeout: 5000 },
    )
  }, [])

  async function handleSubmit() {
    if (!user || !profile) return
    if (!category) {
      setError('어떤 도움이 필요한지 선택해주세요.')
      return
    }
    if (!description.trim()) {
      setError('상세 내용을 입력해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await createHelpRequest({
        requesterId: user.uid,
        requesterName: profile.name,
        requesterGender: profile.gender,
        category,
        description: description.trim(),
        estimatedDuration: duration,
        frequency,
        sameGenderOnly,
        location: location ?? DEFAULT_LOCATION,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40">
      <div className="flex max-h-dvh w-full max-w-[430px] flex-col overflow-y-auto rounded-t-3xl bg-surface p-5 mt-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">도움 요청하기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="min-h-12 min-w-12">
            <X />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">어떤 도움이 필요하신가요?</span>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORY_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`flex min-h-12 flex-col items-center gap-2 rounded-2xl border-2 py-4 ${
                    category === value ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
                  }`}
                >
                  <Icon />
                  <span className="text-base font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold">요청 위치</span>
            <div className="h-40 overflow-hidden rounded-2xl">
              {location ? (
                <KakaoMap center={location} level={4}>
                  <MapMarker position={location} />
                </KakaoMap>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-line bg-surface-alt text-sm text-ink-soft">
                  위치 확인 중...
                </div>
              )}
            </div>
            {locationDenied && (
              <p className="text-sm text-ink-soft">
                위치 권한이 없어 기본 위치(연남동)로 등록됩니다.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold">상세 내용을 적어주세요</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-xl border border-line bg-surface px-4 py-3 text-lg"
              placeholder="예: 핸드폰 화면이 갑자기 안 켜져요. 연락처를 봐야 하는데 도와주세요."
            />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">얼마나 걸릴까요? (예상)</span>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDuration(value)}
                  className={`min-h-12 flex-1 rounded-xl border-2 text-base font-semibold ${
                    duration === value ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
                  }`}
                >
                  {DURATION_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold">얼마나 자주 필요하세요?</span>
            <div className="flex gap-2">
              {FREQUENCY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFrequency(value)}
                  className={`min-h-12 flex-1 rounded-xl border-2 text-base font-semibold ${
                    frequency === value ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-surface px-4 py-3">
            <input
              type="checkbox"
              checked={sameGenderOnly}
              onChange={(e) => setSameGenderOnly(e.target.checked)}
              className="h-6 w-6 accent-primary"
            />
            <span className="text-base font-semibold">같은 성별 봉사자만 받을게요</span>
          </label>

          {error && (
            <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-white disabled:opacity-60"
          >
            <MapPin size={20} />
            {submitting ? '등록 중...' : '핀 등록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
