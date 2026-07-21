import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk'

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY

// 연남동 (데모용 기본 위치)
const DEFAULT_CENTER = { lat: 37.5636, lng: 126.9251 }

function MapStatus({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center whitespace-pre-line rounded-2xl border px-6 text-center text-sm ${
        tone === 'error'
          ? 'border-danger-tint bg-danger-tint text-danger'
          : 'border-line bg-surface-alt text-ink-soft'
      }`}
    >
      {message}
    </div>
  )
}

function LoadedKakaoMap() {
  const [loading, error] = useKakaoLoader({ appkey: KAKAO_APP_KEY })

  if (loading) {
    return <MapStatus message="지도를 불러오는 중입니다..." />
  }

  if (error) {
    return (
      <MapStatus
        tone="error"
        message={'카카오맵을 불러오지 못했습니다.\n키 값과 등록된 도메인을 확인해주세요.'}
      />
    )
  }

  return (
    <Map center={DEFAULT_CENTER} level={4} style={{ width: '100%', height: '100%' }}>
      <MapMarker position={DEFAULT_CENTER}>
        <div className="px-2 py-1 text-xs">연남동</div>
      </MapMarker>
    </Map>
  )
}

export default function KakaoMap() {
  if (!KAKAO_APP_KEY) {
    return (
      <MapStatus
        message={'카카오맵 API 키가 설정되지 않았습니다.\n.env.local에 VITE_KAKAO_MAP_APP_KEY를 추가해주세요.'}
      />
    )
  }

  return <LoadedKakaoMap />
}
