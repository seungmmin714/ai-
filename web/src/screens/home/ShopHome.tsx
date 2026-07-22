import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CustomOverlayMap, MapMarker } from 'react-kakao-maps-sdk'
import { Camera, Clock, Map as MapIcon, Megaphone, Pencil, Store, User, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import KakaoMap, { DEFAULT_CENTER } from '../../components/map/KakaoMap'
import {
  endPromotion,
  startPromotion,
  subscribeToActivePromotions,
  subscribeToShopPromotions,
  updatePromotion,
} from '../../lib/promotions'
import { uploadPromotionPhoto } from '../../lib/photos'
import MyPage from '../mypage/MyPage'
import logo from '../../assets/logo.jpg'
import type { Promotion } from '../../types'

type Tab = 'map' | 'promo' | 'profile'

const MAX_PHOTOS = 5

// 소상공인 전용 홈: 도움 요청·봉사 참여 없이 프로모션 관리에 집중한다.
export default function ShopHome() {
  const { profile } = useAuth()
  const shop = profile?.shopInfo
  const [tab, setTab] = useState<Tab>('promo')
  const [myPromotions, setMyPromotions] = useState<Promotion[]>([])
  const [allPromotions, setAllPromotions] = useState<Promotion[]>([])
  const [center, setCenter] = useState(DEFAULT_CENTER)

  // 폼 상태 (생성/수정 공용)
  const [editing, setEditing] = useState(false)
  const [benefit, setBenefit] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [promoLocation, setPromoLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<{ file: File; preview: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const uid = profile?.uid
    if (!uid) return
    return subscribeToShopPromotions(uid, setMyPromotions)
  }, [profile?.uid])

  useEffect(() => subscribeToActivePromotions(setAllPromotions), [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 },
    )
  }, [])

  const previewsRef = useRef<string[]>([])
  previewsRef.current = photoFiles.map((p) => p.preview)
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const active = myPromotions.find((p) => p.status === 'active') ?? null
  const showForm = !active || editing
  const totalPhotos = existingPhotos.length + photoFiles.length
  // 위치 선택 지도의 중심: 수정이면 기존 프로모션 위치, 생성이면 현재 위치
  const pickerCenter = editing && active ? active.location : center
  const markerPos = promoLocation ?? pickerCenter

  function resetForm() {
    setBenefit('')
    setTimeFrom('')
    setTimeTo('')
    setPromoLocation(null)
    setExistingPhotos([])
    photoFiles.forEach((p) => URL.revokeObjectURL(p.preview))
    setPhotoFiles([])
    setError(null)
  }

  function beginEdit() {
    if (!active) return
    setBenefit(active.benefit)
    setTimeFrom(active.timeFrom ?? '')
    setTimeTo(active.timeTo ?? '')
    setPromoLocation(active.location)
    setExistingPhotos(active.photoUrls ?? [])
    setPhotoFiles([])
    setError(null)
    setEditing(true)
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const room = MAX_PHOTOS - existingPhotos.length
    setPhotoFiles((prev) =>
      [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(
        0,
        Math.max(room, 0),
      ),
    )
  }

  function removeNewPhoto(index: number) {
    setPhotoFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit() {
    if (!profile || !shop) return
    if (!benefit.trim()) {
      setError('혜택 내용을 입력해주세요. 예: 사이드 메뉴 증정')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const photoUrls = [...existingPhotos]
      for (const p of photoFiles) {
        photoUrls.push(await uploadPromotionPhoto(profile.uid, p.file))
      }
      const content = {
        benefit: benefit.trim(),
        timeFrom,
        timeTo,
        photoUrls,
        location: promoLocation ?? pickerCenter,
      }
      if (editing && active) {
        await updatePromotion(active.id, content)
        setEditing(false)
      } else {
        await startPromotion({ shopId: profile.uid, shopName: shop.shopName, ...content })
        setTab('map')
      }
      resetForm()
    } catch {
      setError('저장에 실패했어요. 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEnd() {
    if (!active) return
    setBusy(true)
    try {
      await endPromotion(active.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="z-20 flex shrink-0 items-center justify-between bg-surface px-5 py-3 shadow-sm">
        <h1>
          <img src={logo} alt="여기잇다" className="h-11 w-auto rounded-lg" />
        </h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-tint px-3 py-1 text-xs font-bold text-primary">
            사장님
          </span>
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

      <main className="relative min-h-0 flex-grow overflow-hidden">
        {tab === 'map' && (
          <div className="absolute inset-0">
            <KakaoMap center={center}>
              {allPromotions.map((p) => {
                const mine = p.shopId === profile?.uid
                const pinBody = (
                  <>
                    <span className="mb-1 rounded-full bg-star px-2 py-0.5 text-[11px] font-bold text-white shadow">
                      프로모션중!
                    </span>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${
                        mine ? 'bg-primary' : 'bg-primary-dark'
                      }`}
                    >
                      <Store size={20} />
                    </div>
                    <span className="mt-1 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
                      {mine ? `${p.shopName} (내 가게)` : p.shopName}
                    </span>
                  </>
                )
                return (
                  <CustomOverlayMap key={p.id} position={p.location} clickable={mine} yAnchor={1}>
                    {mine ? (
                      // 내 가게 핀을 누르면 바로 프로모션 관리로 이동
                      <button
                        type="button"
                        onClick={() => setTab('promo')}
                        aria-label="내 프로모션 관리"
                        className="flex flex-col items-center active:scale-90"
                      >
                        {pinBody}
                      </button>
                    ) : (
                      <div className="flex flex-col items-center">{pinBody}</div>
                    )}
                  </CustomOverlayMap>
                )
              })}
            </KakaoMap>
          </div>
        )}

        {tab === 'promo' && shop && (
          <div className="h-full overflow-y-auto p-5 no-scrollbar">
            <div className="mb-4 flex items-center gap-3">
              <img
                src={shop.photoUrl}
                alt="가게 사진"
                className="h-14 w-14 rounded-xl border border-line object-cover"
              />
              <div>
                <p className="text-xl font-bold">{shop.shopName}</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    shop.verified ? 'bg-green-tint text-green' : 'bg-surface-alt text-ink-soft'
                  }`}
                >
                  {shop.verified ? '인증된 가게' : '승인 대기 중'}
                </span>
              </div>
            </div>

            {active && !editing && (
              <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-primary-tint p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <Megaphone size={16} />
                  프로모션 진행 중 — 지도에 노출되고 있어요
                </p>
                {(active.photoUrls ?? []).length > 0 && (
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar">
                    {(active.photoUrls ?? []).map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="프로모션 사진"
                        className="h-36 w-[70%] shrink-0 snap-center rounded-xl border border-line object-cover"
                      />
                    ))}
                  </div>
                )}
                <p className="text-lg font-bold">{active.benefit}</p>
                {active.timeFrom && active.timeTo && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                    <Clock size={14} />
                    혜택 시간 {active.timeFrom} ~ {active.timeTo}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={beginEdit}
                    disabled={busy}
                    className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-base font-bold text-white disabled:opacity-60"
                  >
                    <Pencil size={16} />
                    수정하기
                  </button>
                  <button
                    type="button"
                    onClick={handleEnd}
                    disabled={busy}
                    className="min-h-12 flex-1 rounded-full border-2 border-primary text-base font-bold text-primary disabled:opacity-60"
                  >
                    {busy ? '처리 중...' : '프로모션 종료'}
                  </button>
                </div>
              </div>
            )}

            {showForm && (
              <div className="flex flex-col gap-4">
                {editing ? (
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">프로모션 수정</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false)
                        resetForm()
                      }}
                      className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-ink-soft"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-surface-alt px-4 py-3 text-base text-ink-soft">
                    손님이 뜸한 시간에 프로모션을 올려보세요. 봉사를 완료한 이웃이 혜택을 받으러
                    찾아와요.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-lg font-semibold">혜택 내용</span>
                  <input
                    value={benefit}
                    onChange={(e) => setBenefit(e.target.value)}
                    placeholder="예: 사이드 메뉴 증정, 아메리카노 500원 할인"
                    className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-lg font-semibold">혜택 시간대 (선택)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={timeFrom}
                      onChange={(e) => setTimeFrom(e.target.value)}
                      className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3 text-base"
                    />
                    <span className="text-ink-soft">~</span>
                    <input
                      type="time"
                      value={timeTo}
                      onChange={(e) => setTimeTo(e.target.value)}
                      className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3 text-base"
                    />
                  </div>
                  <p className="text-sm text-ink-soft">
                    비피크 시간대를 정해두면 이웃들이 언제 방문할지 알기 쉬워요.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-lg font-semibold">가게 위치</span>
                  <div className="h-44 overflow-hidden rounded-2xl">
                    <KakaoMap
                      center={pickerCenter}
                      level={4}
                      onClick={(pos) => setPromoLocation(pos)}
                    >
                      <MapMarker
                        position={markerPos}
                        draggable
                        onDragEnd={(marker) => {
                          const pos = marker.getPosition()
                          setPromoLocation({ lat: pos.getLat(), lng: pos.getLng() })
                        }}
                      />
                    </KakaoMap>
                  </div>
                  <p className="text-sm text-ink-soft">
                    지도를 누르거나 핀을 끌어서 가게 위치를 맞춰주세요.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-lg font-semibold">홍보 사진 (선택)</span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {existingPhotos.map((url) => (
                      <div
                        key={url}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line"
                      >
                        <img src={url} alt="홍보 사진" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label="사진 삭제"
                          onClick={() =>
                            setExistingPhotos((prev) => prev.filter((u) => u !== url))
                          }
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {photoFiles.map((p, i) => (
                      <div
                        key={p.preview}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line"
                      >
                        <img
                          src={p.preview}
                          alt="홍보 사진"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label="사진 삭제"
                          onClick={() => removeNewPhoto(i)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {totalPhotos < MAX_PHOTOS && (
                      <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-ink-soft">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                        <Camera size={20} />
                        <span className="text-xs font-semibold">사진 추가</span>
                      </label>
                    )}
                  </div>
                  <p className="text-sm text-ink-soft">
                    메뉴·가게 사진을 올리면 이웃들의 눈에 더 잘 띄어요. (최대 {MAX_PHOTOS}장)
                  </p>
                </div>

                {error && (
                  <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary py-4 text-lg font-bold text-white disabled:opacity-60"
                >
                  <Megaphone size={20} />
                  {busy ? '저장 중...' : editing ? '수정 저장하기' : '프로모션 올리기'}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && <MyPage />}
      </main>

      <nav className="z-40 flex shrink-0 items-center justify-around bg-surface px-2 pb-6 pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <ShopNavItem icon={MapIcon} label="지도" active={tab === 'map'} onClick={() => setTab('map')} />
        <ShopNavItem
          icon={Megaphone}
          label="프로모션"
          active={tab === 'promo'}
          onClick={() => setTab('promo')}
        />
        <ShopNavItem
          icon={User}
          label="내정보"
          active={tab === 'profile'}
          onClick={() => setTab('profile')}
        />
      </nav>
    </div>
  )
}

function ShopNavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: typeof MapIcon
  label: string
  active?: boolean
  onClick: () => void
}) {
  const color = active ? 'text-primary' : 'text-ink-soft'
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
