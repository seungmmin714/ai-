import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.jpg'

export default function LoginScreen({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const { logIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await logIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-5">
      <header className="flex flex-col items-center pt-6">
        <img src={logo} alt="여기잇다" className="h-36 w-auto" />
        <p className="mt-2 text-base text-ink-soft">사람을 잇다, 마음을 잇다</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
            placeholder="비밀번호"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 rounded-full bg-primary text-lg font-bold text-white disabled:opacity-60"
        >
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <button
        type="button"
        onClick={onSwitchToSignUp}
        className="min-h-12 text-base text-ink-soft underline"
      >
        계정이 없으신가요? 회원가입
      </button>
    </div>
  )
}
