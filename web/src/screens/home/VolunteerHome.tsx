import { useEffect, useState } from 'react'
import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import {
  Bell,
  Dumbbell,
  Heart,
  List,
  LocateFixed,
  Map as MapIcon,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Siren,
  Smartphone,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import KakaoMap from '../../components/map/KakaoMap'
import { subscribeToOpenRequests } from '../../lib/requests'
import { applyToRequest, subscribeToVolunteerMatches } from '../../lib/matches'
import MatchDetail from '../match/MatchDetail'
import MyPage from '../mypage/MyPage'
import {
  CATEGORY_LABELS,
  DURATION_LABELS,
  FREQUENCY_LABELS,
  MATCH_STATUS_LABELS,
  type HelpRequest,
  type Match,
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

type CategoryFilter = RequestCategory | 'all'

const FILTER_CHIPS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'labor', label: CATEGORY_LABELS.labor },
  { value: 'digital', label: CATEGORY_LABELS.digital },
  { value: 'errand', label: CATEGORY_LABELS.errand },
  { value: 'safety', label: CATEGORY_LABELS.safety },
]

export default function VolunteerHome() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selected, setSelected] = useState<HelpRequest | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [showMyPage, setShowMyPage] = useState(false)
  const [showSos, setShowSos] = useState(false)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const gender = profile?.gender
    if (!gender) return
    return subscribeToOpenRequests(gender, setRequests, (error) => setLoadError(error.message))
  }, [profile?.gender])

  useEffect(() => {
    const uid = profile?.uid
    if (!uid) return
    return subscribeToVolunteerMatches(uid, setMatches)
  }, [profile?.uid])

  const selectedMatch = matches.find((m) => m.id === selectedMatchId) ?? null
  const visibleRequests =
    filter === 'all' ? requests : requests.filter((r) => r.category === filter)

  async function handleApply(request: HelpRequest) {
    if (!profile) return
    setApplyError(null)
    setApplying(true)
    try {
      await applyToRequest(request, profile)
      setSelected(null)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : '참여에 실패했어요.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="z-20 flex items-center justify-between bg-surface px-5 py-3 shadow-sm">
        <h1 className="text-2xl font-extrabold text-primary">여기잇다</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="알림"
            className="flex h-12 w-12 items-center justify-center rounded-full text-ink active:scale-90"
          >
            <Bell size={22} />
          </button>
          <button
            type="button"
            onClick={() => setShowMyPage(true)}
            aria-label="내 정보"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-lg font-bold text-primary"
          >
            {profile?.name?.[0] ?? <User size={18} />}
          </button>
        </div>
      </header>

      <main className="relative flex-grow overflow-hidden">
        <div className="absolute inset-0">
          <KakaoMap>
            {visibleRequests.map((r) => {
              const Icon = CATEGORY_ICON[r.category]
              return (
                <CustomOverlayMap key={r.id} position={r.location} clickable yAnchor={1}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    aria-label={`${CATEGORY_LABELS[r.category]} 요청`}
                    className="flex flex-col items-center active:scale-90"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${CATEGORY_PIN_CLASS[r.category]}`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="mt-1 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
                      {CATEGORY_LABELS[r.category]}
                      {r.frequency === 'recurring' && ' · 자주'}
                    </span>
                  </button>
                </CustomOverlayMap>
              )
            })}
          </KakaoMap>
        </div>

        <div className="absolute inset-x-0 top-3 z-20 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              className={`min-h-11 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow ${
                filter === chip.value
                  ? 'bg-primary text-white'
                  : 'border border-line bg-surface text-ink-soft'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="현재 위치"
          className={`absolute bottom-40 left-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink shadow-lg active:scale-90 ${
            sheetOpen ? 'hidden' : ''
          }`}
        >
          <LocateFixed size={22} />
        </button>

        <div
          className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-surface shadow-[0_-8px_20px_rgba(0,0,0,0.08)] transition-[height] duration-300 ${
            sheetOpen ? 'h-[72%]' : 'h-36'
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((v) => !v)}
            aria-label={sheetOpen ? '목록 접기' : '목록 펼치기'}
            className="flex w-full justify-center py-3"
          >
            <span className="h-1.5 w-12 rounded-full bg-line-strong" />
          </button>
          <div className="flex-grow overflow-y-auto px-5 pb-5 no-scrollbar">
            <h2 className="mb-3 text-xl font-bold">내 주변의 활발한 활동</h2>

            {loadError && (
              <p className="mb-3 rounded-2xl bg-danger-tint px-4 py-3 text-sm text-danger">
                목록을 불러오지 못했습니다: {loadError}
              </p>
            )}

            {matches.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-ink-soft">내 매칭</h3>
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMatchId(m.id)}
                    className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-left"
                  >
                    <span className="font-bold">
                      {CATEGORY_LABELS[m.category]} · {m.requesterName}님
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-primary-tint px-2 py-1 text-xs font-semibold text-primary">
                      <QrCode size={14} />
                      {MATCH_STATUS_LABELS[m.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {visibleRequests.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
                주변에 등록된 요청이 없어요.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleRequests.map((r) => {
                  const Icon = CATEGORY_ICON[r.category]
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(r)}
                      className="flex gap-3 rounded-2xl border border-line bg-surface-alt p-4 text-left"
                    >
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white ${CATEGORY_PIN_CLASS[r.category]}`}
                      >
                        <Icon size={22} />
                      </div>
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold">{CATEGORY_LABELS[r.category]}</h3>
                          <span className="whitespace-nowrap text-xs font-semibold text-ink-soft">
                            {FREQUENCY_LABELS[r.frequency]} · {DURATION_LABELS[r.estimatedDuration]}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{r.description}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
                          <Heart size={14} />
                          참여하기
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <nav className="z-40 flex items-center justify-around bg-surface px-2 pb-6 pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <NavItem icon={MapIcon} label="지도" active onClick={() => setSheetOpen(false)} />
        <NavItem icon={List} label="목록" onClick={() => setSheetOpen(true)} />
        <NavItem icon={Siren} label="SOS" danger onClick={() => setShowSos(true)} />
        <NavItem icon={User} label="내 정보" onClick={() => setShowMyPage(true)} />
      </nav>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/40">
          <div className="mt-auto w-full max-w-[430px] rounded-t-3xl bg-surface p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{CATEGORY_LABELS[selected.category]}</span>
                <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-semibold text-primary">
                  {FREQUENCY_LABELS[selected.frequency]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="닫기"
                className="min-h-12 min-w-12"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-ink-soft">
              {selected.requesterName}님 · 예상 {DURATION_LABELS[selected.estimatedDuration]}
            </p>
            <p className="mt-2 text-base">{selected.description}</p>
            {applyError && (
              <p className="mt-3 rounded-xl bg-danger-tint px-4 py-3 text-sm text-danger">
                {applyError}
              </p>
            )}
            <button
              type="button"
              onClick={() => handleApply(selected)}
              disabled={applying}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-white disabled:opacity-60"
            >
              <Heart size={20} />
              {applying ? '참여 중...' : '참여하기'}
            </button>
          </div>
        </div>
      )}

      {selectedMatch && (
        <MatchDetail
          match={selectedMatch}
          viewerRole="volunteer"
          onClose={() => setSelectedMatchId(null)}
        />
      )}
      {showMyPage && <MyPage onClose={() => setShowMyPage(false)} />}
      {showSos && <SosMock onClose={() => setShowSos(false)} />}
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  danger = false,
  onClick,
}: {
  icon: typeof MapIcon
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}) {
  const color = active ? 'text-primary' : danger ? 'text-danger' : 'text-ink-soft'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 ${
        active ? 'bg-primary-tint' : ''
      }`}
    >
      <Icon size={24} className={color} />
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
    </button>
  )
}

// SOS 탭은 디자인 목업(데모)입니다. 기획 '절대 원칙'상 실제 응급 신고·119 연동·자동 판단 로직은
// 만들지 않습니다. 여기서는 목업 화면만 보여주고 실제 응급은 직접 119에 연락하도록 안내한다.
function SosMock({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="mt-auto w-full max-w-[430px] rounded-t-3xl bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-danger">
            <Siren size={22} />
            SOS
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="min-h-12 min-w-12">
            <X />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-danger-tint px-4 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white">
            <Siren size={30} />
          </span>
          <p className="text-lg font-bold text-danger">응급 상황 (데모 화면)</p>
          <p className="text-sm text-ink-soft">
            이 화면은 디자인 목업입니다. 실제 119 연동·자동 신고 기능은 제공하지 않아요. 급하시면
            직접 119에 연락해주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-12 w-full rounded-full border border-line text-base font-semibold text-ink-soft"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
