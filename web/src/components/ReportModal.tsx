import { useState } from 'react'
import { X } from 'lucide-react'
import { submitReport } from '../lib/reports'
import { REPORT_REASON_LABELS, type ReportReason } from '../types'

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]

export default function ReportModal({
  matchId,
  reporterId,
  onClose,
}: {
  matchId: string
  reporterId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!reason) {
      setError('신고 사유를 선택해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitReport({ matchId, reporterId, reason, detail: detail.trim() })
      onClose()
    } catch {
      setError('신고 접수에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-black/40">
      <div className="mt-auto flex max-h-dvh w-full max-w-[430px] flex-col overflow-y-auto rounded-t-3xl bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">신고하기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="min-h-12 min-w-12">
            <X />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-base font-semibold">신고 사유</span>
            {REASONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setReason(value)}
                className={`min-h-12 rounded-xl border-2 px-4 text-left text-base font-semibold ${
                  reason === value ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            placeholder="상세 내용을 입력해주세요 (선택)"
            className="rounded-xl border border-line bg-surface px-4 py-3 text-base"
          />

          {error && (
            <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-12 rounded-full bg-danger text-lg font-bold text-white disabled:opacity-60"
          >
            {submitting ? '접수 중...' : '신고 접수'}
          </button>
          <p className="text-center text-sm text-ink-soft">
            신고하면 이 매칭은 즉시 일시중지됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
