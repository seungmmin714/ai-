import { Star } from 'lucide-react'

export default function StarRating({
  value,
  onChange,
  size = 24,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star size={size} className={n <= value ? 'fill-star text-star' : 'text-line-strong'} />
        )
        return onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n}점`}
            onClick={() => onChange(n)}
            className="flex min-h-12 min-w-12 items-center justify-center"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        )
      })}
    </div>
  )
}
