import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Store, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { Gender } from '../../types'

type AccountKind = 'personal' | 'shop'

export default function SignUpScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signUp } = useAuth()
  const [kind, setKind] = useState<AccountKind>('personal')
  const [gender, setGender] = useState<Gender>('female')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopPhoto, setShopPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleShopPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (shopPhoto) URL.revokeObjectURL(shopPhoto.preview)
    setShopPhoto({ file, preview: URL.createObjectURL(file) })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (kind === 'shop') {
      if (!shopName.trim()) {
        setError('가게 이름을 입력해주세요.')
        return
      }
      if (!shopPhoto) {
        setError('가게 인증 사진을 올려주세요.')
        return
      }
    }
    setError(null)
    setSubmitting(true)
    try {
      await signUp({
        name,
        email,
        password,
        gender,
        ...(kind === 'shop' && shopPhoto
          ? { shopName: shopName.trim(), shopPhoto: shopPhoto.file }
          : {}),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-5">
      <header>
        <h1 className="text-2xl font-bold text-primary">여기잇다</h1>
        <p className="mt-1 text-base text-ink-soft">회원가입</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold">가입 유형</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setKind('personal')}
              className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-lg font-semibold ${
                kind === 'personal' ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
              }`}
            >
              <User size={18} />
              일반 회원
            </button>
            <button
              type="button"
              onClick={() => setKind('shop')}
              className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-lg font-semibold ${
                kind === 'shop' ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
              }`}
            >
              <Store size={18} />
              소상공인
            </button>
          </div>
        </div>

        {kind === 'shop' && (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-lg font-semibold">가게 이름</span>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
                placeholder="예: 연남동 분식"
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-lg font-semibold">가게 인증 사진</span>
              <div className="flex items-center gap-3">
                {shopPhoto && (
                  <img
                    src={shopPhoto.preview}
                    alt="가게 사진"
                    className="h-24 w-24 rounded-xl border border-line object-cover"
                  />
                )}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-ink-soft">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleShopPhoto}
                  />
                  <Camera size={20} />
                  <span className="text-xs font-semibold">{shopPhoto ? '다시 찍기' : '사진 올리기'}</span>
                </label>
              </div>
              <p className="text-sm text-ink-soft">
                가게 전경 또는 사업자등록증 사진을 올려주세요. 등록 후 관리자 확인을 거쳐 인증
                배지가 부여됩니다. (승인 기능은 추후 도입 예정)
              </p>
            </div>
          </>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-lg font-semibold">이름</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
            placeholder="이름을 입력하세요"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-semibold">이메일</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
            placeholder="example@email.com"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-semibold">비밀번호</span>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
            placeholder="6자 이상 입력하세요"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold">성별</span>
          <div className="flex gap-3">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`min-h-12 flex-1 rounded-xl border-2 text-lg font-semibold ${
                  gender === g ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
                }`}
              >
                {g === 'female' ? '여성' : '남성'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 rounded-full bg-primary text-lg font-bold text-white disabled:opacity-60"
        >
          {submitting ? '가입 중...' : '가입하기'}
        </button>
      </form>

      <button
        type="button"
        onClick={onSwitchToLogin}
        className="min-h-12 text-base text-ink-soft underline"
      >
        이미 계정이 있으신가요? 로그인
      </button>
    </div>
  )
}
