import { useEffect, useState, type ChangeEvent } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import WarmthBadge from '../../components/WarmthBadge'
import StarRating from '../../components/StarRating'
import { subscribeToReviewsForUser } from '../../lib/reviews'
import { saveGuardianContact, verifyGuardianContact } from '../../lib/users'
import {
  deleteActivityPhoto,
  subscribeToActivityPhotos,
  uploadActivityPhoto,
  type ActivityPhoto,
} from '../../lib/photos'
import type { GuardianContact, Review } from '../../types'

export default function MyPage() {
  const { user, profile, logOut } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    if (!user) return
    return subscribeToReviewsForUser(user.uid, setReviews)
  }, [user])

  if (!profile) return null

  const avg = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  return (
    <div className="h-full overflow-y-auto p-5">
      <h1 className="mb-4 text-2xl font-bold">마이페이지</h1>
      <div className="flex flex-col gap-6">
          <section className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5">
            <div>
              <p className="text-xl font-bold">{profile.name}</p>
              <p className="text-base text-ink-soft">
                {profile.role === 'recipient' ? '도움이 필요해요' : '봉사자'}
              </p>
            </div>
            <WarmthBadge score={profile.warmthScore} />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">받은 후기</h2>
              {reviews.length > 0 && (
                <span className="flex items-center gap-2 text-base font-semibold">
                  <StarRating value={Math.round(avg)} size={18} />
                  {avg.toFixed(1)} ({reviews.length})
                </span>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
                아직 받은 후기가 없어요.
              </p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <StarRating value={r.rating} size={18} />
                    <span className="text-sm text-ink-soft">{r.fromName}님</span>
                  </div>
                  {r.comment && <p className="mt-2 text-base">{r.comment}</p>}
                </div>
              ))
            )}
          </section>

          <PhotosSection uid={profile.uid} />

          {profile.role === 'recipient' && (
            <GuardianSection uid={profile.uid} guardian={profile.guardianContact} />
          )}

          <button
            type="button"
            onClick={() => logOut()}
            className="min-h-12 rounded-full border border-line text-base font-semibold text-ink-soft"
          >
            로그아웃
          </button>
        </div>
      </div>
  )
}

// 함께한 봉사의 순간을 기록하는 활동 사진첩
function PhotosSection({ uid }: { uid: string }) {
  const [photos, setPhotos] = useState<ActivityPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeToActivityPhotos(uid, setPhotos), [uid])

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      await uploadActivityPhoto(uid, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진을 올리지 못했어요.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Camera size={20} />
        활동 사진
      </h2>
      {error && (
        <p className="rounded-xl bg-danger-tint px-4 py-3 text-sm text-danger">{error}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-line"
          >
            <img src={p.url} alt="활동 사진" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="사진 삭제"
              onClick={() => deleteActivityPhoto(uid, p)}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <label
          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-ink-soft ${
            uploading ? 'opacity-60' : ''
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <Plus size={22} />
          <span className="text-xs font-semibold">{uploading ? '올리는 중...' : '사진 추가'}</span>
        </label>
      </div>
      <p className="text-sm text-ink-soft">함께한 봉사의 순간을 기록해보세요.</p>
    </section>
  )
}

// 보호자 연동 (간소화 버전).
// NOTE(추후 과제): 스펙의 전체 흐름(보호자 별도 계정 가입 → 실제 SMS 인증 → 수혜자 대리 요청 등록)과
// 가족관계증명서 기반 실명 인증은 이번 MVP 범위 밖. 여기서는 수혜자 프로필에 보호자 연락처를
// 등록하고, 실제 SMS 대신 데모용 인증코드로 '연동됨' 상태만 처리한다.
function GuardianSection({ uid, guardian }: { uid: string; guardian?: GuardianContact }) {
  const [name, setName] = useState(guardian?.name ?? '')
  const [phone, setPhone] = useState(guardian?.phone ?? '')
  const [sentCode, setSentCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const verified = guardian?.verified === true

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      setError('이름과 연락처를 입력해주세요.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await saveGuardianContact(uid, name.trim(), phone.trim())
      setSentCode(null)
      setCodeInput('')
    } catch {
      setError('저장에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  function handleSendCode() {
    // 데모용 목업: 실서비스에서는 수혜자 휴대폰으로 SMS 인증코드 발송 (Firebase Phone Auth 등)
    setSentCode(String(Math.floor(100000 + Math.random() * 900000)))
    setCodeInput('')
    setError(null)
  }

  async function handleVerify() {
    if (codeInput !== sentCode) {
      setError('인증코드가 일치하지 않아요.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await verifyGuardianContact(uid)
    } catch {
      setError('인증에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">보호자 연동 (선택)</h2>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="보호자 이름"
          className="min-h-12 rounded-xl border border-line px-4 text-base"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="보호자 연락처"
          inputMode="tel"
          className="min-h-12 rounded-xl border border-line px-4 text-base"
        />

        {verified ? (
          <span className="rounded-full bg-green-tint px-3 py-2 text-center text-base font-semibold text-green">
            보호자 연동 완료
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="min-h-12 rounded-full bg-primary text-base font-bold text-white disabled:opacity-60"
            >
              보호자 정보 저장
            </button>
            {guardian && (
              <>
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="min-h-12 rounded-full border border-line text-base font-semibold text-ink-soft"
                >
                  인증코드 받기
                </button>
                {sentCode && (
                  <>
                    <p className="rounded-xl bg-surface-alt px-4 py-3 text-sm text-ink-soft">
                      데모용 인증코드: <b>{sentCode}</b> (실서비스에서는 수혜자 휴대폰으로 문자
                      발송)
                    </p>
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="인증코드 6자리"
                      inputMode="numeric"
                      className="min-h-12 rounded-xl border border-line px-4 text-base"
                    />
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={busy}
                      className="min-h-12 rounded-full bg-primary text-base font-bold text-white disabled:opacity-60"
                    >
                      인증하기
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}

        {error && (
          <p className="rounded-xl bg-danger-tint px-4 py-3 text-sm text-danger">{error}</p>
        )}
        <p className="text-sm text-ink-soft">
          ※ 가족관계증명서 등 서류 기반 실명 인증은 추후 과제입니다.
        </p>
      </div>
    </section>
  )
}
