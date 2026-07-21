import { warmthTier, type WarmthTier } from '../types'

const TIER_CLASS: Record<WarmthTier, string> = {
  cold: 'bg-surface-alt text-ink-soft',
  warm: 'bg-green-tint text-green',
  hot: 'bg-primary-tint text-primary',
}

export default function WarmthBadge({
  score,
  size = 'md',
}: {
  score: number
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${TIER_CLASS[warmthTier(score)]}`}
    >
      온기 {score.toFixed(1)}°
    </span>
  )
}
