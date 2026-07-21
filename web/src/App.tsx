import KakaoMap from './components/map/KakaoMap'

function App() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-5">
      <header>
        <h1 className="text-2xl font-bold text-primary">핑동</h1>
        <p className="mt-1 text-sm text-ink-soft">
          1단계: 프로젝트 셋업 + 카카오맵 연동 테스트
        </p>
      </header>

      <div className="h-80 overflow-hidden rounded-2xl">
        <KakaoMap />
      </div>
    </div>
  )
}

export default App
