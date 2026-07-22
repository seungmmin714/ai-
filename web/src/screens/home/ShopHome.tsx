import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { Camera, Map as MapIcon, Megaphone, Store, User, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import KakaoMap, { DEFAULT_CENTER } from '../../components/map/KakaoMap'
import {
  endPromotion,
  startPromotion,
  subscribeToActivePromotions,
  subscribeToShopPromotions,
} from '../../lib/promotions'
import { uploadPromotionPhoto } from '../../lib/photos'
import MyPage from '../mypage/MyPage'
import logo from '../../assets/logo.jpg'
import type { Promotion } from '../../types'

type Tab = 'map' | 'promo' | 'profile'

// 소상공인 전용 홈: 도움 요청·봉사 참여 없이 프로모션 관리에 집중한다.
export default function ShopHome() {
  const { profile } = useAuth()
  const shop = profile?.shopInfo
  const [tab, setTab] = useState<Tab>('promo')
  const [myPromotions, setMyPromotions] = useState<Promotion[]>([])
  const [allPromotions, setAllPromotions] = useState<Promotion[]>([])
  const [benefit, setBenefit] = useState('')
  const [photoFiles, setPhotoFiles] = useState<{ file: File; preview: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [center, setCenter] = useState(DEFAULT_CENTER)

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

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setPhotoFiles((prev) =>
      [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 5),
    )
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleStart() {
    if (!profile || !shop) return
    if (!benefit.trim()) {
      setError('혜택 내용을 입력해주세요. 예: 사이드 메뉴 증정')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const photoUrls: string[] = []
      for (const p of photoFiles) {
        photoUrls.push(await uploadPromotionPhoto(profile.uid, p.file))
      }
      // 프로모션 위치 = 현재 위치(가게에서 누른다고 가정), 실패 시 지도 중심
      const location = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (!navigator.geolocation) return resolve(center)
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(center),
          { timeout: 5000 },
        )
      })
      await startPromotion({
        shopId: profile.uid,
        shopName: shop.shopName,
        benefit: benefit.trim(),
        photoUrls,
        location,
      })
      setBenefit('')
      setPhotoFiles([])
      setTab('map')
    } catch {
      setError('프로모션 시작에 실패했어요. 다시 시도해주세요.')
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
        <h1 className="flex items-center gap-2">
          <img src={logo} alt="여기잇다" className="h-11 w-auto rounded-lg" />
          <span className="text-xl font-extrabold text-primary">여기잇다</span>
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
              {allPromotions.map((p) => (
                <CustomOverlayMap key={p.id} position={p.location} yAnchor={1}>
                  <div className="flex flex-col items-center">
                    <span className="mb-1 rounded-full bg-star px-2 py-0.5 text-[11px] font-bold text-white shadow">
                      프로모션중!
                    </span>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${
                        p.shopId === profile?.uid ? 'bg-primary' : 'bg-primary-dark'
                      }`}
                    >
                      <Store size={20} />
                    </div>
                    <span className="mt-1 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
                      {p.shopName}
                    </span>
                  </div>
                </CustomOverlayMap>
              ))}
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

            {active ? (
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
                <button
                  type="button"
                  onClick={handleEnd}
                  disabled={busy}
                  className="min-h-12 rounded-full border-2 border-primary text-base font-bold text-primary disabled:opacity-60"
                >
                  {busy ? '처리 중...' : '프로모션 종료'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="rounded-2xl bg-surface-alt px-4 py-3 text-base text-ink-soft">
                  손님이 뜸한 시간에 프로모션을 올려보세요. 봉사를 완료한 이웃이 혜택을 받으러
                  찾아와요.
                </p>

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
                  <span className="text-lg font-semibold">홍보 사진 (선택)</span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
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
                          onClick={() => removePhoto(i)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {photoFiles.length < 5 && (
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
                    메뉴·가게 사진을 올리면 이웃들의 눈에 더 잘 띄어요. (최대 5장)
                  </p>
                </div>

                {error && (
                  <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleStart}
                  disabled={busy}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary py-4 text-lg font-bold text-white disabled:opacity-60"
                >
                  <Megaphone size={20} />
                  {busy ? '올리는 중...' : '프로모션 올리기'}
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
