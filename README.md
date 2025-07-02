# Planning Poker

실시간 스크럼 플래닝 포커 애플리케이션입니다. Jira와 연동하여 이슈를 가져와서 스토리 포인트를 추정할 수 있습니다.

## ✨ 주요 기능

- 🎯 **실시간 투표**: WebSocket을 통한 실시간 스토리 포인트 투표
- 🔗 **Jira 연동**: Jira 스프린트에서 이슈를 자동으로 가져오기
- 🎨 **직관적 UI**: Jira 스타일의 우선순위 화살표와 배지 시스템
- 👥 **호스트 관리**: 컨텍스트 메뉴를 통한 쉬운 스토리 선택
- 🚀 **간편한 배포**: Docker로 원클릭 환경 구성

## 🚀 빠른 시작

### 📋 사전 요구사항
- Node.js 20+
- pnpm
- Docker (선택사항)

### 🔧 환경 설정

1. **저장소 클론**
```bash
git clone <repository-url>
cd planning-poker
```

2. **환경변수 설정**
```bash
./scripts/setup-env.sh
# 또는
npm run setup:env
```

3. **환경변수 파일 편집**
```bash
# Jira 설정 정보 입력
vi .env
vi server/.env  
vi client/.env
```

### 🏃‍♂️ 개발 환경 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작 (서버 + 클라이언트)
npm run dev

# 브라우저에서 접속
# http://localhost:4000
```

### 🐳 Docker 환경 실행

```bash
# Docker 환경변수 설정
vi .env.docker

# Docker 환경 시작  
./scripts/start-docker.sh
# 또는
npm run docker:start

# 브라우저에서 접속
# http://localhost
```

## 🏗️ 프로젝트 구조

```
planning-poker/
├── client/                 # React 클라이언트
│   ├── src/
│   └── Dockerfile
├── server/                 # Node.js 서버
│   ├── src/
│   └── Dockerfile
├── shared/                 # 공유 타입 정의
├── scripts/                # 자동화 스크립트
│   ├── setup-env.sh       # 환경변수 설정 헬퍼
│   ├── start-docker.sh    # Docker 환경 시작
│   └── stop-docker.sh     # Docker 환경 정지
├── nginx/                  # Nginx 설정 (Docker용)
└── docker-compose.yml      # Docker 구성
```

## 🔧 개발 가이드

### 스크립트 명령어

```bash
# 개발 환경
npm run dev              # 서버 + 클라이언트 동시 실행
npm run dev:server       # 서버만 실행
npm run dev:client       # 클라이언트만 실행

# 빌드
npm run build           # 전체 빌드
npm run build:server    # 서버 빌드  
npm run build:client    # 클라이언트 빌드

# 테스트
npm test               # 전체 테스트
npm run test:server    # 서버 테스트
npm run test:client    # 클라이언트 테스트

# Docker
./scripts/start-docker.sh      # Docker 환경 시작
./scripts/stop-docker.sh       # Docker 환경 정지
npm run docker:start           # Docker 환경 시작 (npm)
npm run docker:stop            # Docker 환경 정지 (npm)

# 환경 설정
npm run setup:env              # 환경변수 파일 생성
npm run setup                  # 환경설정 + 의존성 설치
```

### 개발 워크플로우

1. **TDD 플로우 준수**
   - 테스트 작성 → 실패 확인 → 코드 작성 → 테스트 통과 → 커밋

2. **기능 구현 후 테스트**
   - Playwright로 E2E 테스트 실행

3. **커밋 전 확인사항**
   - 모든 테스트 통과 확인
   - 코드 린트 및 타입 체크

## 🎨 UI/UX 특징

### Jira 스타일 우선순위 표시
- **Highest**: ⬆️ (빨간색)
- **High**: ↗️ (주황색)  
- **Medium**: ➡️ (주황색)
- **Low**: ↘️ (초록색)
- **Lowest**: ⬇️ (초록색)

### 인터랙션
- **카드 클릭**: Jira 이슈로 바로 이동
- **우클릭**: 호스트용 컨텍스트 메뉴 (투표 안건 선택)
- **실시간 동기화**: 모든 참가자에게 즉시 반영

## 🔗 Jira 연동 설정

### 1. Jira API 토큰 생성
1. https://id.atlassian.com/manage-profile/security/api-tokens 접속
2. "Create API token" 클릭
3. 토큰 이름 입력 후 생성
4. 생성된 토큰 복사

### 2. 환경변수 설정
```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com  
JIRA_API_TOKEN=your-generated-token
JIRA_DEFAULT_PROJECT_KEY=PROJECT_KEY
```

## 📚 추가 문서

- [Docker 환경 가이드](README.docker.md)
- [API 문서](server/README.md)
- [클라이언트 가이드](client/README.md)

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License.

## 🆘 지원

문제가 있거나 도움이 필요하면 이슈를 생성해주세요.