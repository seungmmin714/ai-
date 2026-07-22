import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Camera, Check, Flag, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import QrScanner from '../../components/qr/QrScanner'
import StarRating from '../../components/StarRating'
import ReportModal from '../../components/ReportModal'
import { acceptMatch, checkInMatch, completeMatch, declineMatch } from '../../lib/matches'
import { submitReview, subscribeToMatchReviews } from '../../lib/reviews'
import {
  CATEGORY_LABELS,
  MATCH_STATUS_LABELS,
  type Match,
  type Review,
  type UserRole,
} from '../../types'

export default function MatchDetail({
  match,
  viewerRole,
  onClose,
}: {
  match: Match
  viewerRole: UserRole
  onClose: () => void
}) {
  const { profile } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => subscribeToMatchReviews(match.id, setReviews), [match.id])

  const isVolunteer = viewerRole === 'volunteer'
  const toUserId = isVolunteer ? match.requesterId : match.volunteerId
  const toName = isVolunteer ? match.requesterName : match.volunteerName
  const myReview = reviews.find((r) => r.fromUserId === profile?.uid) ?? null
  const receivedReview = reviews.find((r) => r.toUserId === profile?.uid) ?? null

  async function handleScan(text: string) {
    setScanning(false)
    if (text !== match.qrCode) {
      setError('QR이 일치하지 않아요. 요청자의 화면 QR을 스캔해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await checkInMatch(match.id)
    } catch {
      setError('체크인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete() {
    setError(null)
    setSubmitting(true)
    try {
      await completeMatch(match.id, match.requestId)
      // 닫지 않고 완료 상태로 남겨 곧바로 후기를 남길 수 있게 한다
    } catch {
      setError('완료 처리에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAccept() {
    setError(null)
    setSubmitting(true)
    try {
      await acceptMatch(match.id, match.requestId)
    } catch {
      setError('수락에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecline() {
    setError(null)
    setSubmitting(true)
    try {
      await declineMatch(match.id)
      onClose()
    } catch {
      setError('처리에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitReview() {
    if (!profile) return
    if (rating === 0) {
      setError('별점을 선택해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitReview({
        matchId: match.id,
        fromUserId: profile.uid,
        fromName: profile.name,
        toUserId,
        rating,
        comment: comment.trim(),
      })
    } catch {
      setError('후기 등록에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40">
      <div className="mt-auto flex max-h-dvh w-full max-w-[430px] flex-col overflow-y-auto rounded-t-3xl bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">매칭 상세</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="min-h-12 min-w-12">
            <X />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-alt px-4 py-3">
            <span className="text-lg font-bold">{CATEGORY_LABELS[match.category]}</span>
            <span className="rounded-full bg-primary-tint px-3 py-1 text-sm font-semibold text-primary">
              {MATCH_STATUS_LABELS[match.status]}
            </span>
          </div>

          <p className="text-base text-ink-soft">
            {isVolunteer
              ? `${match.requesterName}님의 요청이에요.`
              : match.status === 'pending'
                ? `${match.volunteerName}님의 참여 신청이 도착했어요.`
                : `봉사자 ${match.volunteerName}님과 매칭되었어요.`}
          </p>

          {match.status === 'pending' ? (
            isVolunteer ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-alt px-4 py-6 text-center">
                <p className="text-base font-semibold">요청자의 수락을 기다리는 중이에요.</p>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={submitting}
                  className="min-h-12 w-full rounded-full border border-line text-base font-semibold text-ink-soft disabled:opacity-60"
                >
                  {submitting ? '처리 중...' : '신청 취소'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-base">
                  <b>{match.volunteerName}</b>님이 이 요청에 참여를 신청했어요.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="min-h-12 flex-1 rounded-full border border-line text-base font-semibold text-ink-soft disabled:opacity-60"
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={submitting}
                    className="min-h-12 flex-1 rounded-full bg-primary text-base font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? '처리 중...' : '수락하기'}
                  </button>
                </div>
              </div>
            )
          ) : match.status === 'reported' ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-danger-tint px-4 py-6">
              <p className="text-base font-semibold text-danger">
                신고 접수로 일시중지된 매칭이에요.
              </p>
            </div>
          ) : match.status === 'completed' ? (
            <div className="flex flex-col gap-4">
              {match.checkInAt && (
                <p className="rounded-xl bg-green-tint px-4 py-2 text-sm text-green">
                  봉사 인증 완료 · 도착 {new Date(match.checkInAt).toLocaleString('ko-KR')}
                  {match.checkOutAt &&
                    ` · 종료 ${new Date(match.checkOutAt).toLocaleTimeString('ko-KR')}`}
                </p>
              )}
              {receivedReview && (
                <div className="rounded-2xl border border-line bg-surface-alt p-4">
                  <p className="text-sm font-semibold text-ink-soft">받은 후기</p>
                  <div className="mt-1">
                    <StarRating value={receivedReview.rating} />
                  </div>
                  {receivedReview.comment && (
                    <p className="mt-2 text-base">{receivedReview.comment}</p>
                  )}
                </div>
              )}
              {myReview ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-green-tint px-4 py-6">
                  <Check className="text-green" />
                  <p className="text-base font-semibold text-green">후기를 남겼어요. 감사합니다!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-lg font-semibold">{toName}님은 어떠셨나요?</span>
                  <StarRating value={rating} onChange={setRating} size={32} />
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="한 줄 후기를 남겨주세요 (선택)"
                    className="rounded-xl border border-line bg-surface px-4 py-3 text-base"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="min-h-12 rounded-full bg-primary text-lg font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? '등록 중...' : '후기 남기기'}
                  </button>
                </div>
              )}
            </div>
          ) : viewerRole === 'recipient' ? (
            match.status === 'confirmed' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-line bg-white p-4">
                  <QRCodeCanvas value={match.qrCode} size={200} />
                </div>
                <p className="text-center text-lg text-ink-soft">
                  봉사자가 도착하면 이 QR을 보여주세요.
                  <br />
                  <span className="text-sm">봉사자가 실제로 왔는지 인증하는 체크인용이에요.</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-green-tint px-4 py-6">
                <Check className="text-green" />
                <p className="text-base font-semibold text-green">봉사가 진행 중이에요.</p>
                {match.checkInAt && (
                  <p className="text-sm text-green">
                    도착 인증 완료 · {new Date(match.checkInAt).toLocaleTimeString('ko-KR')}
                  </p>
                )}
              </div>
            )
          ) : scanning ? (
            <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
          ) : match.status === 'confirmed' ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setScanning(true)
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary py-4 text-lg font-bold text-white"
            >
              <Camera size={20} />
              QR 스캔으로 도착 인증하기
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary py-4 text-lg font-bold text-white disabled:opacity-60"
            >
              <Check size={20} />
              {submitting ? '처리 중...' : '봉사 완료'}
            </button>
          )}

          {error && (
            <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">{error}</p>
          )}

          {match.status !== 'pending' && match.status !== 'reported' && (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-danger text-base font-semibold text-danger"
            >
              <Flag size={18} />
              신고하기
            </button>
          )}
        </div>
      </div>

      {showReport && profile && (
        <ReportModal
          matchId={match.id}
          reporterId={profile.uid}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
