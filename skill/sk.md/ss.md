# 핑동(PingDong) MVP 개발 프롬프트

> 아래 내용을 VS Code AI(Claude Code, Copilot Chat 등)에게 통째로 붙여넣고 시작하세요.
> 맨 아래 "개발 순서 제안"의 1번부터 순서대로 진행해달라고 요청하는 걸 추천합니다.

---

## 프로젝트 개요

'핑동'은 독거노인이 응급 상황도, 정기 돌봄도 아닌 즉흥적인 생활 도움(장보기, 전구 교체 등)이 필요할 때, 지도 기반으로 근처 봉사자와 실시간으로 매칭해주는 지역 자원봉사 웹 플랫폼입니다.

### 절대 지켜야 할 설계 원칙
- 이 서비스는 응급 상황(낙상, 화재, 심정지 등) 대응을 목적으로 하지 않습니다. 응급 관련 자동 신고·판단 로직은 만들지 마세요.
- 생활지원사 수준의 정기 방문 스케줄 관리 기능도 만들지 마세요. "정기적으로 필요함"은 단순 태그로만 표시합니다.
- 무료 자원봉사 기반 서비스이며, 결제·포인트 지급 로직은 이번 단계에서 만들지 않습니다.
- 특히 수혜자(어르신)가 쓰는 화면은 최대한 단순하게 만드세요(버튼 크게, 글자 크게, 단계 최소화).

## 사용자 유형
1. **수혜자**: 도움이 필요한 독거노인 본인, 또는 보호자가 대리로 요청 등록
2. **봉사자**: 도움을 주고 싶은 지역 주민

## 기술 스택
- Frontend: React + TypeScript + Vite
- 스타일: Tailwind CSS
- 지도: 카카오맵 JavaScript SDK
- 인증/DB/스토리지: Firebase (Authentication, Firestore, Storage)
- QR 생성: qrcode.react / QR 스캔: html5-qrcode

(스택을 바꾸고 싶다면 이 부분만 알려주면, 아래 기능 명세는 동일하게 적용됩니다.)

## 구현할 기능 (이번 MVP 범위)

### 1. 역할 구분 회원가입/로그인
- 가입 시 "도움이 필요해요(수혜자)" / "봉사하고 싶어요(봉사자)" 중 하나 선택
- 휴대폰번호 또는 이메일 기반 가입 + 카카오 로그인 지원
- 로그인 후 역할에 따라 다른 홈 화면으로 라우팅

### 2. 단발성/정기성 태그
- 요청 등록 폼에 "한 번만 필요해요" / "자주 필요해요" 라디오 버튼
- 스케줄 자동화는 만들지 말고, 목록·지도 아이콘에 태그만 구분 표시

### 3. 동성 매칭 옵션
- 요청 등록 시 "동성 봉사자만 받을게요" 체크박스(기본값 off)
- 체크 시 요청자와 다른 성별 봉사자 계정에는 해당 요청이 지도·목록에서 보이지 않도록 조회 단계에서 필터링

### 4. 신고 버튼
- 모든 요청 상세·매칭 상세 화면에 신고 버튼 배치
- 신고 사유(노쇼/부적절한 언행/금전 요구/안전 문제/기타) 선택 + 상세 내용 입력
- 신고 접수 시 해당 매칭 상태를 자동으로 '일시중지'로 변경

### 5. QR 체크인
- 매칭이 확정되면 해당 매칭 건에 고유 QR코드 생성
- 봉사자가 도착 시 QR 스캔 → 매칭 상태 '진행중'으로 변경, 완료 시 버튼 클릭으로 '완료' 처리

### 6. 기본 후기
- 매칭 완료 후 양방향 후기 작성(수혜자→봉사자, 봉사자→수혜자): 별점(1~5) + 한 줄 텍스트
- 사용자 프로필에 받은 후기 목록과 평균 별점 표시

### 7. 보호자 연락처 등록 (간소화 버전)
- 수혜자 프로필에 보호자 이름+연락처 등록(선택 항목)
- 보호자가 별도 계정으로 가입 후, 수혜자 휴대폰으로 SMS 인증코드를 보내 승인하면 '보호자 연동' 상태가 되어 수혜자를 대신해 요청을 등록할 수 있음
- 가족관계증명서 등 실명 서류 인증은 이번 단계에서 구현하지 않습니다 (추후 과제로 코드 주석에 남겨두세요)

### 8. 온기지수
- 모든 사용자는 온기지수 36.5에서 시작
- 매칭 완료 + 후기 등록 시 별점에 비례해 소폭 상승/하락 (예: 별점 4~5점 +0.1, 1~2점 -0.1)
- 신고가 접수되어 확정되면 -0.5
- 프로필에 온도 배지로 표시 (36.5 미만 회색, 36.5~37.5 초록, 37.5 이상 주황 등 색상 구분)

### 9. 심플 UI/UX
- 수혜자용 화면: 본문 글자 최소 18px, 버튼 터치 영역 최소 48px, 요청 등록은 3단계 이내
- 전체적으로 색상 대비를 크게 하고, 아이콘과 텍스트를 함께 표기

## 데이터 모델 (참고용, 자유롭게 조정 가능)

```typescript
interface User {
  id: string;
  name: string;
  phone: string;
  role: 'recipient' | 'volunteer';
  gender: 'male' | 'female';
  warmthScore: number; // default 36.5
  guardianContact?: { name: string; phone: string; verified: boolean };
  createdAt: Timestamp;
}

interface HelpRequest {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  category: string;
  location: { lat: number; lng: number };
  frequency: 'once' | 'recurring';
  sameGenderOnly: boolean;
  status: 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Timestamp;
}

interface Match {
  id: string;
  requestId: string;
  volunteerId: string;
  qrCode: string;
  checkInAt?: Timestamp;
  checkOutAt?: Timestamp;
  status: 'confirmed' | 'in_progress' | 'completed' | 'reported';
}

interface Review {
  id: string;
  matchId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1~5
  comment: string;
  createdAt: Timestamp;
}

interface Report {
  id: string;
  matchId: string;
  reporterId: string;
  reason: 'no_show' | 'inappropriate' | 'money_request' | 'safety' | 'other';
  detail: string;
  status: 'pending' | 'resolved';
  createdAt: Timestamp;
}
```

## 화면 목록
1. 회원가입/로그인 (역할 선택 포함)
2. 수혜자 홈 (도움요청 등록 버튼 + 내 요청 목록)
3. 요청 등록 폼
4. 봉사자 홈 (지도에 주변 요청 핑 표시 + 필터)
5. 요청 상세 (참여하기 버튼 + 신고버튼)
6. 매칭 상세 (QR 표시/스캔, 상태 변경)
7. 후기 작성
8. 마이페이지 (내 정보, 온기지수, 후기 목록, 보호자 연동 관리)

## 이번 단계에서 만들지 않는 것 (범위를 넘어가지 마세요)
- 응급 상황 자동 119 연동·응급 판단 로직
- 생활지원사 수준의 정기 방문 스케줄 자동화
- 가족관계증명서 등 실명 서류 기반 정식 가족 인증
- 리워드 포인트 지급, 지역 상점 제휴 연동
- SNS 공유 카드 생성 기능
- 관리자 대시보드, 봉사 관리자 권한 체계
- 결제 기능

## 개발 순서 제안
1. 프로젝트 셋업 (Vite + React + TS + Tailwind) + 카카오맵 연동 테스트
2. Firebase Auth 연동 — 역할 구분 회원가입·로그인
3. 요청 등록 CRUD + 지도에 핑 표시
4. 단발/정기 태그, 동성 매칭 옵션 필터링
5. 참여 신청 → 매칭 확정 흐름 + QR 체크인
6. 후기 작성 + 온기지수 계산 로직
7. 신고 버튼 + 보호자 연락처 등록·SMS 인증
8. 전체 화면 반응형·접근성 다듬기

먼저 1번 프로젝트 셋업부터 시작해서, 단계별로 하나씩 진행해주세요. 각 단계가 끝나면 다음 단계로 넘어가기 전에 정상 동작하는지 확인하고 알려주세요.

