import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Camera, Check, X } from 'lucide-react'
import QrScanner from '../../components/qr/QrScanner'
import { checkInMatch, completeMatch } from '../../lib/matches'
import { CATEGORY_LABELS, MATCH_STATUS_LABELS, type Match, type UserRole } from '../../types'

export default function MatchDetail({
  match,
  viewerRole,
  onClose,
}: {
  match: Match
  viewerRole: UserRole
  onClose: () => void
}) {
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      onClose()
    } catch {
      setError('완료 처리에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40">
      <div className="mt-auto flex max-h-dvh w-full max-w-[430px] flex-col overflow-y-auto rounded-t-3xl bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">매칭 상세</h2>
          <button type="button" onClick={onClose} className="min-h-12 min-w-12">
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
            {viewerRole === 'recipient'
              ? `봉사자 ${match.volunteerName}님과 매칭되었어요.`
              : `${match.requesterName}님의 요청이에요.`}
          </p>

          {viewerRole === 'recipient' ? (
            match.status === 'confirmed' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-line bg-white p-4">
                  <QRCodeCanvas value={match.qrCode} size={200} />
                </div>
                <p className="text-center text-base text-ink-soft">
                  봉사자가 도착하면 이 QR을 보여주세요.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-green-tint px-4 py-6">
                <Check className="text-green" />
                <p className="text-base font-semibold text-green">봉사가 진행 중이에요.</p>
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
              QR 스캔하고 시작하기
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
        </div>
      </div>
    </div>
  )
}
