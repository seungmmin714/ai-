import { useEffect, useState } from 'react'
import { QrCode } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cancelHelpRequest, subscribeToMyRequests } from '../../lib/requests'
import { subscribeToRequesterMatches } from '../../lib/matches'
import MatchDetail from '../match/MatchDetail'
import {
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  MATCH_STATUS_LABELS,
  STATUS_LABELS,
  type HelpRequest,
  type Match,
} from '../../types'
import RequestFormModal from './RequestFormModal'

export default function RecipientHome() {
  const { user, profile, logOut } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeToMyRequests(user.uid, setRequests, (error) => setLoadError(error.message))
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeToRequesterMatches(user.uid, setMatches)
  }, [user])

  const selectedMatch = matches.find((m) => m.id === selectedMatchId) ?? null

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
        onClick={() => setShowForm(true)}
        className="min-h-12 rounded-2xl bg-primary px-6 py-5 text-xl font-bold text-white"
      >
        도움 요청하기
      </button>

      {matches.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">진행 중인 매칭</h2>
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMatchId(m.id)}
              className="flex items-center justify-between rounded-2xl border-2 border-primary bg-primary-tint p-4 text-left"
            >
              <div>
                <span className="text-lg font-bold">{CATEGORY_LABELS[m.category]}</span>
                <p className="text-base text-ink-soft">{m.volunteerName}님과 매칭됨</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white">
                <QrCode size={16} />
                {MATCH_STATUS_LABELS[m.status]}
              </span>
            </button>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">내 요청 목록</h2>
        {loadError && (
          <p className="rounded-2xl bg-danger-tint px-4 py-3 text-base text-danger">
            목록을 불러오지 못했습니다: {loadError}
          </p>
        )}
        {requests.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-base text-ink-soft">
            아직 등록한 요청이 없어요.
          </p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{CATEGORY_LABELS[r.category]}</span>
                <span className="text-base text-ink-soft">{STATUS_LABELS[r.status]}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-semibold text-primary">
                  {FREQUENCY_LABELS[r.frequency]}
                </span>
                {r.sameGenderOnly && (
                  <span className="rounded-full bg-green-tint px-2 py-0.5 text-xs font-semibold text-green">
                    동성 봉사자만
                  </span>
                )}
              </div>
              <p className="mt-1 text-base text-ink-soft">{r.description}</p>
              {r.status === 'open' && (
                <button
                  type="button"
                  onClick={() => cancelHelpRequest(r.id)}
                  className="mt-3 min-h-12 rounded-full border border-line px-4 text-base text-ink-soft"
                >
                  요청 취소
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {showForm && <RequestFormModal onClose={() => setShowForm(false)} />}
      {selectedMatch && (
        <MatchDetail
          match={selectedMatch}
          viewerRole="recipient"
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </div>
  )
}
