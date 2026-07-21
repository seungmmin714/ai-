import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { Gender, UserRole } from '../../types'

const ROLE_OPTIONS: { value: UserRole; title: string; description: string }[] = [
  { value: 'recipient', title: '도움이 필요해요', description: '이웃에게 간단한 도움을 요청하세요' },
  { value: 'volunteer', title: '도움을 주고 싶어요', description: '가까운 이웃에게 온기를 나눠주세요' },
]

export default function SignUpScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signUp } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [gender, setGender] = useState<Gender>('female')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!role) {
      setError('역할을 선택해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await signUp({ name, email, password, role, gender })
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
        <div className="flex flex-col gap-3">
          <span className="text-lg font-semibold">어떤 역할로 가입하시나요?</span>
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={`min-h-12 rounded-2xl border-2 px-5 py-4 text-left transition ${
                role === option.value
                  ? 'border-primary bg-primary-tint'
                  : 'border-line bg-surface'
              }`}
            >
              <span className="block text-lg font-bold">{option.title}</span>
              <span className="block text-base text-ink-soft">{option.description}</span>
            </button>
          ))}
        </div>

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
