# Planning Poker E2E Test Suite

포괄적인 WebSocket 기반 End-to-End 테스트 스위트입니다. 실제 서버와 클라이언트 간의 소켓 통신을 테스트합니다.

## 📋 테스트 범위

### 🏠 Room Management (`room-management.test.ts`)
- **방 생성/참가**: 호스트 권한, 고유 ID 생성, 플레이어 참가
- **호스트 관리**: 호스트 이양, 자동 재할당, 권한 검증
- **동기화**: 실시간 상태 동기화, 다중 플레이어 지원
- **정리**: 방 정리, 연결 해제 처리

### 🗳️ Story & Voting (`story-voting.test.ts`)
- **스토리 관리**: 생성, 권한 검증, 다중 스토리
- **투표 프로세스**: 투표, 변경, 공개, 재시작
- **완료 처리**: 최종 포인트 설정, 상태 전환
- **엣지 케이스**: 잘못된 값, 동시 투표, 관전자 처리

### 🌐 Browser Integration (`browser-integration.test.ts`)
- **전체 사용자 여정**: 방 생성부터 투표 완료까지
- **실시간 동기화**: UI 업데이트, 상태 변경
- **오류 처리**: 잘못된 방 코드, 연결 오류, 중복 닉네임
- **반응형**: 모바일 터치, 성능 최적화

### 💪 Stress Testing (`stress-testing.test.ts`)
- **고부하**: 50개 동시 연결, 메시지 버스트
- **동시 작업**: 다중 방 생성, 리소스 관리
- **메모리**: 생명주기 스트레스, 메시지 큐 부하
- **복구**: 연결/해제 사이클, 오류 복구
- **성능**: 응답 시간 벤치마크

## 🚀 설치 및 실행

### 의존성 설치
```bash
cd e2e
npm install
```

### 개별 테스트 실행
```bash
# 방 관리 테스트
npm run test:room

# 투표 기능 테스트  
npm run test:voting

# 브라우저 통합 테스트
npm run test:browser

# 스트레스 테스트
npm run test:stress
```

### 전체 테스트 실행
```bash
# 모든 E2E 테스트
npm test

# 실시간 모드
npm run test:watch

# UI 모드
npm run test:ui

# 커버리지 포함
npm run test:coverage
```

## 🏗️ 아키텍처

### WebSocketTestClient
실제 WebSocket 연결을 통한 테스트 클라이언트:
```typescript
const client = new WebSocketTestClient();
await client.connect();

client.send({
  type: 'ROOM_CREATE',
  payload: { nickname: 'TestUser' }
});

const response = await client.waitForMessage('room:created');
expect(response.payload.room.id).toBeDefined();
```

### 환경 설정
자동 서버/클라이언트 시작 및 정리:
```typescript
beforeAll(async () => {
  await startServer();  // 포트 8081에서 서버 시작
  await startClient();  // 포트 5174에서 클라이언트 시작
});

afterAll(() => {
  stopServer();
  stopClient();
});
```

### 브라우저 자동화
Playwright를 통한 실제 브라우저 테스트:
```typescript
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:5174');
await page.fill('input[placeholder="Enter your nickname"]', 'TestUser');
await page.click('button:has-text("Create Room")');
```

## 📊 테스트 메트릭

### 성능 기준
- **평균 응답 시간**: < 1초
- **최대 응답 시간**: < 5초  
- **동시 연결**: 50개 지원
- **메시지 처리**: 100개/초

### 커버리지 목표
- **기능 커버리지**: 95%+
- **시나리오 커버리지**: 모든 사용자 여정
- **오류 상황**: 모든 예외 처리
- **성능 임계값**: 모든 부하 시나리오

## 🔧 테스트 구성

### 포트 설정
- **테스트 서버**: 8081
- **테스트 클라이언트**: 5174
- **WebSocket**: ws://localhost:8081

### 타임아웃
- **전체 테스트**: 120초
- **연결 대기**: 60초
- **메시지 대기**: 5초
- **브라우저 작업**: 10초

### 재시도 정책
- **실패 시 재시도**: 1회
- **네트워크 오류**: 자동 재연결
- **브라우저 오류**: 자동 복구

## 📈 CI/CD 통합

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    npm install
    npm test
```

### 테스트 결과
- **XML 리포트**: JUnit 형식
- **HTML 리포트**: 상세 결과
- **커버리지**: Codecov 연동

## 🛠️ 개발 가이드

### 새 테스트 추가
1. 적절한 테스트 파일 선택
2. `describe` 블록으로 그룹화
3. `beforeEach`로 설정
4. `afterEach`로 정리

### 디버깅
```bash
# 상세 로그 출력
DEBUG=* npm test

# 브라우저 헤드리스 모드 해제
HEADLESS=false npm run test:browser

# 특정 테스트만 실행
npm test -- --testNamePattern="should create room"
```

### 모범 사례
- **독립성**: 각 테스트는 독립적
- **정리**: 리소스 정리 필수
- **타임아웃**: 적절한 대기 시간
- **재현성**: 일관된 결과

## 🐛 문제 해결

### 일반적인 문제
- **포트 충돌**: 다른 포트 사용
- **연결 실패**: 서버 시작 확인
- **타임아웃**: 대기 시간 증가
- **메모리 누수**: 정리 코드 확인

### 로그 분석
```bash
# 서버 로그
tail -f server.log

# 클라이언트 로그  
tail -f client.log

# 테스트 로그
npm test -- --reporter=verbose
```

## 📚 추가 자료

- [Vitest 문서](https://vitest.dev/)
- [Playwright 문서](https://playwright.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Planning Poker API 문서](../docs/api.md)

---

**소켓 통신 기반 E2E 테스트로 실제 사용자 경험을 완벽하게 검증합니다.**