import { useAuth } from '../../context/AuthContext'

export default function RecipientHome() {
  const { profile, logOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">여기잇다</h1>
          <p className="mt-1 text-lg text-ink-soft">{profile?.name}님, 안녕하세요</p>
        </div>
        <button
          type="button"
          onClick={() => logOut()}
          className="min-h-12 rounded-full border border-line px-4 text-base text-ink-soft"
        >
          로그아웃
        </button>
      </header>

      <button
        type="button"
        className="min-h-12 rounded-2xl bg-primary px-6 py-5 text-xl font-bold text-white"
      >
        도움 요청하기
      </button>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">내 요청 목록</h2>
        <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
          아직 등록한 요청이 없어요.
        </p>
      </section>
    </div>
  )
}
