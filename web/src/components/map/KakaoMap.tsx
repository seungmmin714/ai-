import type { ReactNode } from 'react'
import { Map, useKakaoLoader } from 'react-kakao-maps-sdk'

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY

// 연남동 (데모용 기본 위치)
export const DEFAULT_CENTER = { lat: 37.5636, lng: 126.9251 }

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

interface LoadedKakaoMapProps {
  center: { lat: number; lng: number }
  level: number
  children?: ReactNode
}

function LoadedKakaoMap({ center, level, children }: LoadedKakaoMapProps) {
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
    <Map center={center} level={level} style={{ width: '100%', height: '100%' }}>
      {children}
    </Map>
  )
}

interface KakaoMapProps {
  center?: { lat: number; lng: number }
  level?: number
  children?: ReactNode
}

export default function KakaoMap({ center = DEFAULT_CENTER, level = 4, children }: KakaoMapProps) {
  if (!KAKAO_APP_KEY) {
    return (
      <MapStatus
        message={'카카오맵 API 키가 설정되지 않았습니다.\n.env.local에 VITE_KAKAO_MAP_APP_KEY를 추가해주세요.'}
      />
    )
  }

  return (
    <LoadedKakaoMap center={center} level={level}>
      {children}
    </LoadedKakaoMap>
  )
}
