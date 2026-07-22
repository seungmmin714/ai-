import { useEffect, useState, type ReactNode } from 'react'
import { MessageCircle, QrCode, X } from 'lucide-react'
import WarmthBadge from '../../components/WarmthBadge'
import StarRating from '../../components/StarRating'
import { acceptMatch, declineMatch } from '../../lib/matches'
import { getUserProfile } from '../../lib/users'
import { getReviewsForUser } from '../../lib/reviews'
import {
  CATEGORY_LABELS,
  MATCH_STATUS_LABELS,
  type HelpRequest,
  type Match,
  type Review,
  type UserProfile,
} from '../../types'

export default function ApplicantsModal({
  request,
  matches,
  onClose,
  onOpenChat,
  onOpenMatch,
}: {
  request: HelpRequest
  matches: Match[]
  onClose: () => void
  onOpenChat: (matchId: string) => void
  onOpenMatch: (matchId: string) => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const needed = request.neededVolunteers ?? 1
  const pending = matches.filter((m) => m.status === 'pending')
  const accepted = matches.filter((m) => m.status !== 'pending')
  const acceptedCount = accepted.filter((m) => m.status !== 'reported').length
  const full = acceptedCount >= needed

  async function run(matchId: string, action: () => Promise<void>) {
    setError(null)
    setBusyId(matchId)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리에 실패했어요.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40">
      <div className="mt-auto flex max-h-[90dvh] w-full max-w-[430px] flex-col overflow-y-auto rounded-t-3xl bg-surface p-5 no-scrollbar">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold">지원자 관리</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="min-h-12 min-w-12">
            <X />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-soft">
          {CATEGORY_LABELS[request.category]} · 모집 {needed}명 · 확정 {acceptedCount}명
          {full && ' · 모집 완료'}
        </p>

        {error && (
          <p className="mb-3 rounded-xl bg-danger-tint px-4 py-3 text-sm text-danger">{error}</p>
        )}

        <div className="flex flex-col gap-5">
          {accepted.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-base font-bold">확정된 봉사자</h3>
              {accepted.map((m) => (
                <ApplicantCard key={m.id} match={m}>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-full bg-primary-tint px-2 py-1 text-xs font-semibold text-primary">
                      {MATCH_STATUS_LABELS[m.status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenChat(m.id)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-full bg-primary text-sm font-bold text-white"
                    >
                      <MessageCircle size={16} />
                      채팅방 열기
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMatch(m.id)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-full border border-line text-sm font-semibold text-ink-soft"
                    >
                      <QrCode size={16} />
                      인증 QR
                    </button>
                  </div>
                </ApplicantCard>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold">지원자 {pending.length > 0 && `(${pending.length}명)`}</h3>
            {pending.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface-alt px-5 py-6 text-center text-sm text-ink-soft">
                아직 새 지원자가 없어요.
              </p>
            ) : (
              pending.map((m) => (
                <ApplicantCard key={m.id} match={m}>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => run(m.id, () => declineMatch(m.id))}
                      disabled={busyId === m.id}
                      className="min-h-12 flex-1 rounded-full border border-line text-sm font-semibold text-ink-soft disabled:opacity-60"
                    >
                      거절
                    </button>
                    <button
                      type="button"
                      onClick={() => run(m.id, () => acceptMatch(m.id, request.id))}
                      disabled={busyId === m.id || full}
                      className="min-h-12 flex-1 rounded-full bg-primary text-sm font-bold text-white disabled:opacity-60"
                    >
                      {full ? '모집 완료' : busyId === m.id ? '처리 중...' : '수락하기'}
                    </button>
                  </div>
                </ApplicantCard>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// 지원자 한 명: 이름 + 온기지수 배지 + 평균 별점·후기 수 + 최근 후기 한 줄
function ApplicantCard({ match, children }: { match: Match; children?: ReactNode }) {
  const [applicant, setApplicant] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    let active = true
    getUserProfile(match.volunteerId).then((p) => {
      if (active) setApplicant(p)
    })
    getReviewsForUser(match.volunteerId).then((r) => {
      if (active) setReviews(r)
    })
    return () => {
      active = false
    }
  }, [match.volunteerId])

  const avg = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0
  const latestComment = reviews.find((r) => r.comment)?.comment

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{match.volunteerName}님</p>
        {applicant && <WarmthBadge score={applicant.warmthScore} size="sm" />}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
        {reviews.length > 0 ? (
          <>
            <StarRating value={Math.round(avg)} size={14} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span>· 후기 {reviews.length}개</span>
          </>
        ) : (
          <span>아직 받은 후기가 없어요</span>
        )}
      </div>
      {latestComment && (
        <p className="mt-1 line-clamp-1 text-sm text-ink-soft">“{latestComment}”</p>
      )}
      {children}
    </div>
  )
}
