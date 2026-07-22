import { useEffect, useState } from 'react'
import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import {
  Bell,
  Heart,
  List,
  LocateFixed,
  Map as MapIcon,
  MessageCircle,
  Plus,
  QrCode,
  Siren,
  User,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import KakaoMap, { DEFAULT_CENTER } from '../../components/map/KakaoMap'
import { CATEGORY_ICON, CATEGORY_PIN_CLASS } from '../../components/categoryMeta'
import {
  cancelHelpRequest,
  subscribeToMyRequests,
  subscribeToOpenRequests,
} from '../../lib/requests'
import {
  applyToRequest,
  subscribeToRequesterMatches,
  subscribeToVolunteerMatches,
} from '../../lib/matches'
import MatchDetail from '../match/MatchDetail'
import MyPage from '../mypage/MyPage'
import ChatRoom from '../chat/ChatRoom'
import RequestFormModal from './RequestFormModal'
import ApplicantsModal from './ApplicantsModal'
import {
  CATEGORY_LABELS,
  DURATION_LABELS,
  FREQUENCY_LABELS,
  MATCH_STATUS_LABELS,
  STATUS_LABELS,
  type HelpRequest,
  type Match,
  type RequestCategory,
  type UserRole,
} from '../../types'

type Tab = 'map' | 'list' | 'chat' | 'sos' | 'profile'
type Mode = 'browse' | 'mine'
type CategoryFilter = RequestCategory | 'all'

const FILTER_CHIPS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  ...(Object.entries(CATEGORY_LABELS) as [RequestCategory, string][]).map(([value, label]) => ({
    value: value as CategoryFilter,
    label,
  })),
]

// '내 주변의 활발한 활동' 목록 반경 (지도에는 전국 요청을 모두 표시)
const NEARBY_RADIUS_M = 1000

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
}

export default function Home() {
  const { profile } = useAuth()
  const uid = profile?.uid
  const [tab, setTab] = useState<Tab>('map')
  const [mode, setMode] = useState<Mode>('browse')
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [openRequests, setOpenRequests] = useState<HelpRequest[]>([])
  const [myRequests, setMyRequests] = useState<HelpRequest[]>([])
  const [volunteerMatches, setVolunteerMatches] = useState<Match[]>([])
  const [requesterMatches, setRequesterMatches] = useState<Match[]>([])
  const [selected, setSelected] = useState<HelpRequest | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [openChatMatchId, setOpenChatMatchId] = useState<string | null>(null)
  const [manageRequestId, setManageRequestId] = useState<string | null>(null)
  const [nearOnly, setNearOnly] = useState(true)

  // 처음 열 때 조용히 현재 위치를 잡아 지도·주변 필터에 사용
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyLocation(loc)
        setCenter(loc)
      },
      () => {},
      { timeout: 8000 },
    )
  }, [])

  useEffect(() => {
    const gender = profile?.gender
    if (!gender) return
    return subscribeToOpenRequests(gender, setOpenRequests, (e) => setLoadError(e.message))
  }, [profile?.gender])

  useEffect(() => {
    if (!uid) return
    return subscribeToMyRequests(uid, setMyRequests)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeToVolunteerMatches(uid, setVolunteerMatches)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeToRequesterMatches(uid, setRequesterMatches)
  }, [uid])

  // 내가 이미 지원한 요청은 둘러보기에서 숨긴다
  const appliedRequestIds = new Set(volunteerMatches.map((m) => m.requestId))
  const browseRequests = openRequests
    .filter((r) => r.requesterId !== uid)
    .filter((r) => !appliedRequestIds.has(r.id))
    .filter((r) => filter === 'all' || r.category === filter)
  const allMatches = [...volunteerMatches, ...requesterMatches]
  const selectedMatch = allMatches.find((m) => m.id === selectedMatchId) ?? null
  const selectedMatchRole: UserRole =
    selectedMatch && selectedMatch.volunteerId === uid ? 'volunteer' : 'recipient'
  const mapRequests =
    mode === 'browse' ? browseRequests : myRequests.filter((r) => r.status !== 'cancelled')
  const chatMatches = allMatches.filter((m) => m.status !== 'pending')
  const openChat = chatMatches.find((m) => m.id === openChatMatchId) ?? null
  const manageRequest = myRequests.find((r) => r.id === manageRequestId) ?? null

  // 목록용: 내 위치 기준 1km 이내(가까운 순). 위치를 모르면 전체 표시.
  const listRequests = browseRequests
    .map((r) => ({
      request: r,
      distance: myLocation ? distanceMeters(myLocation, r.location) : null,
    }))
    .filter((x) => !nearOnly || x.distance === null || x.distance <= NEARBY_RADIUS_M)
    .sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE))

  // 알림은 별도 컬렉션 없이 내 매칭 상태에서 파생한다.
  // requestId가 있으면 탭 시 지원자 관리 화면, 없으면 매칭 상세로 이동.
  const notifications = [
    ...requesterMatches
      .filter((m) => m.status === 'pending')
      .map((m) => ({
        id: `pend-${m.id}`,
        matchId: m.id,
        requestId: m.requestId as string | null,
        text: `${m.volunteerName}님이 회원님의 ${CATEGORY_LABELS[m.category]} 요청에 지원했어요. 확인해주세요.`,
      })),
    ...volunteerMatches
      .filter((m) => m.status === 'confirmed')
      .map((m) => ({
        id: `acc-${m.id}`,
        matchId: m.id,
        requestId: null as string | null,
        text: `${m.requesterName}님이 회원님의 ${CATEGORY_LABELS[m.category]} 봉사 지원을 수락했어요!`,
      })),
    ...allMatches
      .filter((m) => m.status === 'completed')
      .map((m) => ({
        id: `done-${m.id}`,
        matchId: m.id,
        requestId: null as string | null,
        text: `${CATEGORY_LABELS[m.category]} 봉사가 완료되었어요. 후기를 남겨보세요.`,
      })),
    ...allMatches
      .filter((m) => m.status === 'reported')
      .map((m) => ({
        id: `rep-${m.id}`,
        matchId: m.id,
        requestId: null as string | null,
        text: '신고 접수로 일시중지된 매칭이 있어요.',
      })),
  ]

  function locateMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyLocation(loc)
        setCenter(loc)
      },
      () => setLoadError('위치 권한을 확인해주세요.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  // 목록에서 활동을 누르면 지도 탭으로 이동해 위치를 보여준다
  function goToRequest(r: HelpRequest) {
    setSelected(r)
    setCenter(r.location)
    setSheetOpen(false)
    setTab('map')
  }

  async function handleApply(request: HelpRequest) {
    if (!profile) return
    setApplyError(null)
    setApplying(true)
    try {
      await applyToRequest(request, profile)
      setSelected(null)
      // 신청은 '수락 대기' 상태. 요청자가 수락하면 채팅·QR이 열린다.
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : '참여에 실패했어요.')
    } finally {
      setApplying(false)
    }
  }

  function renderModeBody() {
    if (mode === 'browse') {
      return (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">내 주변의 활발한 활동</h2>
            <div className="flex shrink-0 rounded-full border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setNearOnly(true)}
                className={`min-h-9 rounded-full px-3 text-xs font-bold ${
                  nearOnly ? 'bg-primary text-white' : 'text-ink-soft'
                }`}
              >
                1km
              </button>
              <button
                type="button"
                onClick={() => setNearOnly(false)}
                className={`min-h-9 rounded-full px-3 text-xs font-bold ${
                  !nearOnly ? 'bg-primary text-white' : 'text-ink-soft'
                }`}
              >
                전체
              </button>
            </div>
          </div>
          {nearOnly && !myLocation && (
            <p className="mb-3 rounded-xl bg-surface-alt px-4 py-2 text-sm text-ink-soft">
              위치 권한을 허용하면 1km 이내 활동만 골라 보여드려요.
            </p>
          )}
          {loadError && (
            <p className="mb-3 rounded-2xl bg-danger-tint px-4 py-3 text-sm text-danger">
              목록을 불러오지 못했습니다: {loadError}
            </p>
          )}
          {volunteerMatches.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ink-soft">내 봉사</h3>
              {volunteerMatches.map((m) => (
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
          {listRequests.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
              {nearOnly && myLocation
                ? '1km 이내에 등록된 활동이 없어요. 전체로 바꾸면 다른 지역 활동도 볼 수 있어요.'
                : '주변에 등록된 요청이 없어요.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {listRequests.map(({ request: r, distance }) => {
                const Icon = CATEGORY_ICON[r.category]
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => goToRequest(r)}
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
                          {distance !== null && (
                            <span className="font-bold text-primary">
                              {formatDistance(distance)} ·{' '}
                            </span>
                          )}
                          {DURATION_LABELS[r.estimatedDuration]} · 모집 {r.neededVolunteers ?? 1}명
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{r.description}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
                        <Heart size={14} />
                        지도에서 보기 · 참여하기
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )
    }

    return (
      <>
        <h2 className="mb-3 text-xl font-bold">내가 올린 요청</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-white"
        >
          <Plus size={20} />
          도움 요청하기
        </button>
        {myRequests.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
            아직 등록한 요청이 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {myRequests.map((r) => {
              const apps = requesterMatches.filter((m) => m.requestId === r.id)
              const pendingCount = apps.filter((m) => m.status === 'pending').length
              const acceptedCount = apps.filter(
                (m) => m.status !== 'pending' && m.status !== 'reported',
              ).length
              const needed = r.neededVolunteers ?? 1
              return (
                <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{CATEGORY_LABELS[r.category]}</span>
                    <span className="text-base text-ink-soft">{STATUS_LABELS[r.status]}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-semibold text-primary">
                      {FREQUENCY_LABELS[r.frequency]}
                    </span>
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-soft">
                      모집 {needed}명 · 확정 {acceptedCount}명
                    </span>
                    {r.sameGenderOnly && (
                      <span className="rounded-full bg-green-tint px-2 py-0.5 text-xs font-semibold text-green">
                        동성 봉사자만
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg text-ink">{r.description}</p>
                  <div className="mt-3 flex gap-2">
                    {r.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => cancelHelpRequest(r.id)}
                        className="min-h-12 flex-1 rounded-full border border-line text-base text-ink-soft"
                      >
                        요청 취소
                      </button>
                    )}
                    {apps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setManageRequestId(r.id)}
                        className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-full bg-primary text-base font-bold text-white"
                      >
                        <Users size={16} />
                        지원자 보기{pendingCount > 0 && ` (${pendingCount})`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="z-20 flex shrink-0 items-center justify-between bg-surface px-5 py-3 shadow-sm">
        <h1 className="text-2xl font-extrabold text-primary">여기잇다</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            aria-label="알림"
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-ink active:scale-90"
          >
            <Bell size={22} />
            {notifications.length > 0 && (
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-danger" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            aria-label="내 정보"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-lg font-bold text-primary"
          >
            {profile?.name?.[0] ?? <User size={18} />}
          </button>
        </div>
      </header>

      {(tab === 'map' || tab === 'list') && (
        <div className="shrink-0 bg-surface px-4 pb-3">
          <div className="flex rounded-full bg-surface-alt p-1">
            <button
              type="button"
              onClick={() => setMode('browse')}
              className={`min-h-11 flex-1 rounded-full text-sm font-bold ${
                mode === 'browse' ? 'bg-primary text-white' : 'text-ink-soft'
              }`}
            >
              봉사 둘러보기
            </button>
            <button
              type="button"
              onClick={() => setMode('mine')}
              className={`min-h-11 flex-1 rounded-full text-sm font-bold ${
                mode === 'mine' ? 'bg-primary text-white' : 'text-ink-soft'
              }`}
            >
              내가 올린 요청
            </button>
          </div>
        </div>
      )}

      <main className="relative min-h-0 flex-grow overflow-hidden">
        {tab === 'map' && (
          <>
            <div className="absolute inset-0">
              <KakaoMap center={center}>
                {myLocation && (
                  <CustomOverlayMap position={myLocation} xAnchor={0.5} yAnchor={0.5}>
                    <span className="block h-4 w-4 rounded-full border-2 border-white bg-info shadow-[0_0_0_4px_rgba(107,143,196,0.35)]" />
                  </CustomOverlayMap>
                )}
                {mapRequests.map((r) => {
                  const Icon = CATEGORY_ICON[r.category]
                  const pin = (
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${CATEGORY_PIN_CLASS[r.category]}`}
                    >
                      <Icon size={20} />
                    </div>
                  )
                  return (
                    <CustomOverlayMap key={r.id} position={r.location} clickable yAnchor={1}>
                      {mode === 'browse' ? (
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          aria-label={`${CATEGORY_LABELS[r.category]} 요청`}
                          className="flex flex-col items-center active:scale-90"
                        >
                          {pin}
                          <span className="mt-1 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
                            {CATEGORY_LABELS[r.category]}
                            {r.frequency === 'recurring' && ' · 자주'}
                          </span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center">
                          {pin}
                          <span className="mt-1 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
                            {STATUS_LABELS[r.status]}
                          </span>
                        </div>
                      )}
                    </CustomOverlayMap>
                  )
                })}
              </KakaoMap>
            </div>

            {mode === 'browse' && (
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
            )}

            <button
              type="button"
              onClick={locateMe}
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
                {renderModeBody()}
              </div>
            </div>
          </>
        )}

        {tab === 'list' && <div className="h-full overflow-y-auto p-5">{renderModeBody()}</div>}

        {tab === 'chat' &&
          (openChat ? (
            <ChatRoom
              match={openChat}
              currentUserId={uid ?? ''}
              currentUserName={profile?.name ?? ''}
              onBack={() => setOpenChatMatchId(null)}
            />
          ) : (
            <div className="h-full overflow-y-auto p-5">
              <h2 className="mb-3 text-xl font-bold">채팅</h2>
              {chatMatches.length === 0 ? (
                <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
                  아직 채팅방이 없어요. 참여 신청이 수락되면 채팅이 열려요.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {chatMatches.map((m) => {
                    const other = m.volunteerId === uid ? m.requesterName : m.volunteerName
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setOpenChatMatchId(m.id)}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left"
                      >
                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                          <MessageCircle size={22} />
                        </span>
                        <div className="min-w-0 flex-grow">
                          <p className="font-bold">{other}님</p>
                          <p className="text-sm text-ink-soft">
                            {CATEGORY_LABELS[m.category]} · {MATCH_STATUS_LABELS[m.status]}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

        {tab === 'sos' && (
          <div className="h-full overflow-y-auto p-5">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-danger-tint px-4 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white">
                <Siren size={30} />
              </span>
              <p className="text-lg font-bold text-danger">응급 상황 (데모 화면)</p>
              <p className="text-sm text-ink-soft">
                이 화면은 디자인 목업입니다. 실제 119 연동·자동 신고 기능은 제공하지 않아요.
                급하시면 직접 119에 연락해주세요.
              </p>
            </div>
          </div>
        )}

        {tab === 'profile' && <MyPage />}
      </main>

      <nav className="z-40 flex shrink-0 items-center justify-around bg-surface px-2 pb-6 pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <NavItem icon={MapIcon} label="지도" active={tab === 'map'} onClick={() => setTab('map')} />
        <NavItem icon={List} label="목록" active={tab === 'list'} onClick={() => setTab('list')} />
        <NavItem
          icon={MessageCircle}
          label="채팅"
          active={tab === 'chat'}
          onClick={() => setTab('chat')}
        />
        <NavItem icon={Siren} label="SOS" active={tab === 'sos'} danger onClick={() => setTab('sos')} />
        <NavItem
          icon={User}
          label="내정보"
          active={tab === 'profile'}
          onClick={() => setTab('profile')}
        />
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
              {selected.requesterName}님 · 예상 {DURATION_LABELS[selected.estimatedDuration]} · 모집{' '}
              {selected.neededVolunteers ?? 1}명
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

      {manageRequest && (
        <ApplicantsModal
          request={manageRequest}
          matches={requesterMatches.filter((m) => m.requestId === manageRequest.id)}
          onClose={() => setManageRequestId(null)}
          onOpenChat={(matchId) => {
            setManageRequestId(null)
            setOpenChatMatchId(matchId)
            setTab('chat')
          }}
          onOpenMatch={(matchId) => setSelectedMatchId(matchId)}
        />
      )}
      {selectedMatch && (
        <MatchDetail
          match={selectedMatch}
          viewerRole={selectedMatchRole}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
      {showCreate && <RequestFormModal onClose={() => setShowCreate(false)} />}

      {showNotifications && (
        <div className="fixed inset-0 z-50" onClick={() => setShowNotifications(false)}>
          <div
            className="absolute right-3 top-16 max-h-[70%] w-[88%] max-w-[360px] overflow-y-auto rounded-2xl bg-surface p-3 shadow-xl no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 px-1 text-base font-bold">알림</h3>
            {notifications.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-soft">새 알림이 없어요.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (n.requestId) {
                        setManageRequestId(n.requestId)
                      } else {
                        setSelectedMatchId(n.matchId)
                      }
                      setShowNotifications(false)
                    }}
                    className="rounded-xl border border-line bg-surface-alt p-3 text-left text-sm"
                  >
                    {n.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
  const color = active && !danger ? 'text-primary' : danger ? 'text-danger' : 'text-ink-soft'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 ${
        active ? (danger ? 'bg-danger-tint' : 'bg-primary-tint') : ''
      }`}
    >
      <Icon size={24} className={color} />
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
    </button>
  )
}
