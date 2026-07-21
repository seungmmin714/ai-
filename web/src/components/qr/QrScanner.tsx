import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const READER_ID = 'qr-reader'

export default function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (text: string) => void
  onClose: () => void
}) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID)
    let handled = false
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (handled) return
          handled = true
          onScanRef.current(decodedText)
        },
        () => {},
      )
      .catch(() => setError('카메라를 열 수 없어요. 권한을 확인해주세요.'))
    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div id={READER_ID} className="overflow-hidden rounded-2xl bg-black" />
      {error && (
        <p className="rounded-xl bg-danger-tint px-4 py-3 text-base text-danger">{error}</p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="min-h-12 rounded-full border border-line text-base text-ink-soft"
      >
        스캔 취소
      </button>
    </div>
  )
}
