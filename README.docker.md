# Planning Poker - Docker 환경

Docker를 사용하여 Planning Poker 애플리케이션을 쉽게 실행할 수 있습니다.

## 🚀 빠른 시작

### 1. 환경변수 설정
환경변수 설정 헬퍼 스크립트를 실행하여 필요한 파일들을 생성하세요:

```bash
./scripts/setup-env.sh
# 또는
npm run setup:env
```

그 후 `.env.docker` 파일을 편집하여 실제 Jira 설정으로 업데이트하세요:

```bash
# .env.docker
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_DEFAULT_PROJECT_KEY=YOUR_PROJECT_KEY
```

### 2. Docker 환경 시작
```bash
./scripts/start-docker.sh
# 또는
npm run docker:start
```

### 3. 애플리케이션 접속
- **Planning Poker**: http://localhost
- **API Health Check**: http://localhost/health

### 4. Docker 환경 정지
```bash
./scripts/stop-docker.sh
# 또는
npm run docker:stop
```

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │    │     Nginx       │    │     Server      │
│   (React SPA)   │    │ (Reverse Proxy) │    │   (Node.js)     │
│     Port: 80    │◄───┤     Port: 80    ├───►│    Port: 9000   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 라우팅 규칙
- `http://localhost/` → React 클라이언트
- `http://localhost/api/*` → Node.js 서버
- `ws://localhost/` → WebSocket 연결 (서버)

## 🐳 Docker 서비스

### 1. **planning-poker-client**
- React 애플리케이션 빌드 및 정적 파일 서빙
- Nginx Alpine 기반
- 포트: 80 (내부)

### 2. **planning-poker-server**  
- Node.js 백엔드 서버
- WebSocket 지원
- 포트: 9000 (내부)

### 3. **planning-poker-nginx**
- 리버스 프록시
- API 라우팅 및 정적 파일 서빙
- 포트: 80 (외부 노출)

## 🔧 개발자 명령어

### 로그 확인
```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f nginx
```

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 서비스 재시작
```bash
# 특정 서비스 재시작
docker-compose restart server

# 전체 재시작
docker-compose restart
```

### 완전 정리 (볼륨 포함)
```bash
docker-compose down --volumes --remove-orphans
docker system prune -a
```

## 🔍 트러블슈팅

### 1. 빌드 실패
```bash
# 캐시 없이 다시 빌드
docker-compose build --no-cache
```

### 2. 포트 충돌
```bash
# 포트 사용 확인
lsof -i :80

# 기존 프로세스 종료 후 재시작
./scripts/stop-docker.sh
./scripts/start-docker.sh
```

### 3. 환경변수 문제
- `.env.docker` 파일 존재 여부 확인
- Jira API 토큰 유효성 확인

### 4. WebSocket 연결 문제
- 브라우저 개발자 도구에서 네트워크 탭 확인
- nginx 로그 확인: `docker-compose logs nginx`

## 📝 참고사항

- 개발 환경에서는 `npm run dev` 사용 권장
- 프로덕션 배포 시 Docker 환경 사용
- Jira API 토큰은 보안상 안전한 곳에 보관
- 환경변수 파일은 `.gitignore`에 포함되어 있음