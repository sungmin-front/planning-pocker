# Planning Poker

> 🎯 Real-time Scrum Planning Poker with Jira Integration  
> WebSocket 기반 실시간 스토리 포인트 추정 도구

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

실시간 스크럼 플래닝 포커 애플리케이션입니다. Jira와 연동하여 이슈를 가져와서 스토리 포인트를 추정할 수 있습니다.

## ✨ 주요 기능

- 🎯 **실시간 투표**: WebSocket을 통한 실시간 스토리 포인트 투표
- 🔗 **Jira 연동**: Jira 스프린트에서 이슈를 자동으로 가져오기
- 🎨 **직관적 UI**: Jira 스타일의 우선순위 화살표와 배지 시스템
- 👥 **호스트 관리**: 컨텍스트 메뉴를 통한 쉬운 스토리 선택
- 🚀 **간편한 배포**: Docker로 원클릭 환경 구성
- 📊 **통계 및 내보내기**: 세션 결과를 JSON/CSV/HTML로 내보내기
- 🌍 **다국어 지원**: 한국어/영어 지원

## 🚀 초간단 시작하기

### 🔥 원클릭 설치 (추천)

```bash
# 저장소 클론
git clone https://github.com/your-username/pocker_v3.git
cd pocker_v3

# 원클릭 설치 및 실행 🚀
pnpm run quickstart
```

또는 **Make** 사용:
```bash
make quickstart
```

### 🐳 Docker 원클릭 (프로덕션 권장)

```bash
# Docker 환경으로 바로 시작
pnpm run quickstart:docker
# 또는
make quickstart-docker
```

### 📋 사전 요구사항
- **Node.js** 18+ 
- **pnpm** (자동 설치됨)
- **Docker** (Docker 사용시)

## 📖 상세 설정 가이드

처음 사용하시나요? **위의 원클릭 설치**를 먼저 시도해보세요! 

### 🔧 수동 설정 (고급 사용자)

#### 1. 저장소 클론
```bash
git clone https://github.com/your-username/pocker_v3.git
cd pocker_v3
```

#### 2. 환경변수 설정
```bash
# 환경변수 템플릿 생성
npm run setup:env
make setup  # 또는 Make 사용
```

#### 3. Jira 연동 설정
```bash
# 환경변수 파일 편집 (실제 값으로 변경)
vi .env              # 메인 설정
vi server/.env       # 서버 설정  
vi client/.env       # 클라이언트 설정
vi .env.docker       # Docker 설정
```

#### 4. 개발 환경 실행
```bash
# 의존성 설치
npm install
make install  # 또는 Make 사용

# 개발 서버 시작
npm start
make start  # 또는 Make 사용

# 접속: http://localhost:4000
```

#### 5. Docker 환경 실행
```bash
# Docker 환경 시작  
npm run docker:start
make docker-start  # 또는 Make 사용

# 접속: http://localhost
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

## 🛠️ 개발자 명령어 가이드

### 🔥 핵심 명령어 (가장 많이 사용)

| 명령어 | pnpm | make | 설명 |
|--------|-----|------|------|
| **빠른 시작** | `pnpm run quickstart` | `make quickstart` | 설정 + 설치 + 실행 |
| **개발 서버** | `pnpm start` | `make start` | 개발 서버 시작 |
| **검증** | `pnpm run validate` | `make validate` | 코드 품질 + 테스트 |
| **Docker 시작** | `pnpm run docker:start` | `make docker-start` | Docker 환경 시작 |

### 📦 설치 및 설정

```bash
# 🚀 원클릭 설정
pnpm run quickstart        # 설정 + 설치 + 실행
pnpm run bootstrap         # 설정 + 설치만
make quickstart          # Make 버전

# 🔧 개별 설정
pnpm run setup:env        # 환경변수 파일 생성
pnpm install              # 의존성 설치 (직접)
pnpm run setup            # 환경변수 파일만 생성
```

### 💻 개발 환경

```bash
# 🏃 서버 실행
pnpm start                # 개발 서버 시작 (추천)
pnpm run dev              # 서버 + 클라이언트 동시 실행
pnpm run dev:server       # 서버만 실행
pnpm run dev:client       # 클라이언트만 실행

# 🏗️ 빌드
pnpm run build            # 전체 빌드
```

### 🐳 Docker 명령어

```bash
# 🚀 Docker 환경
pnpm run docker:start     # Docker 환경 시작
pnpm run docker:stop      # Docker 환경 정지
make docker-start        # Make 버전
make docker-stop         # Make 버전
```

### 🧪 테스트 및 품질 관리

```bash
# ✅ 테스트
pnpm test                 # 전체 테스트
pnpm run health           # 빠른 상태 확인

# 📝 코드 품질
pnpm run lint             # 코드 품질 검사
pnpm run format           # 코드 포맷팅
pnpm run validate         # 테스트 + 린트

# 🔍 프로젝트 검증
./scripts/validate.sh    # 전체 검증
./scripts/validate.sh --quick  # 빠른 검증
```

### 🔄 유지보수

```bash
# 🧹 정리
pnpm run clean            # 빌드 파일 정리
pnpm run reset            # 전체 재설치
make clean              # Make 버전
make reset              # Make 버전
```

### 🆘 문제 해결

```bash
# ❓ 도움말
make help               # 사용 가능한 Make 명령어 보기
./planning-poker help   # CLI 도움말 보기
pnpm run validate        # 프로젝트 상태 점검
./planning-poker status # 프로젝트 상태 확인
```

## 🔧 CLI 도구 사용법

Planning Poker는 사용하기 쉬운 CLI 도구를 제공합니다:

```bash
# CLI 도구 사용
./planning-poker <command>

# 예시
./planning-poker quickstart    # 빠른 시작
./planning-poker start         # 개발 서버 시작  
./planning-poker validate      # 프로젝트 검증
./planning-poker help          # 도움말 보기
```

**주요 CLI 명령어:**
- `quickstart` - 전체 설정 + 설치 + 실행
- `start` - 개발 서버 시작
- `validate` - 프로젝트 상태 검증
- `docker-start` - Docker 환경 시작
- `status` - 현재 상태 확인
- `help` - 전체 명령어 목록

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

## 🔧 문제 해결

### 빌드 오류 해결

**TypeScript 컴파일 오류 발생 시:**
```bash
# TypeScript 체크 없이 빌드 (임시 해결책)
pnpm run build

# TypeScript 체크와 함께 빌드 (권장, 오류 수정 후)
pnpm --filter client run build:check
```

**일반적인 문제들:**

1. **빌드 실패**
   - `pnpm run clean && pnpm install` - 종속성 재설치
   - `pnpm run validate` - 프로젝트 상태 확인

2. **포트 충돌**
   - 포트 4000, 9000 사용 중인 경우 해당 프로세스 종료
   - `./planning-poker status` - 포트 상태 확인

3. **환경변수 누락**
   - `pnpm run setup:env` - 환경변수 파일 재생성
   - `.env` 파일들의 플레이스홀더 값들을 실제 값으로 변경

4. **Docker 환경 문제**
   - `pnpm run docker:stop && pnpm run docker:start` - 컨테이너 재시작
   - `docker-compose logs -f` - 로그 확인

### 개발 상태

**현재 알려진 이슈:**
- 일부 TypeScript 타입 오류가 남아있음 (기능에는 영향 없음)
- UI 컴포넌트 라이브러리 타입 불일치
- 테스트 파일 타입 정의 부족

**해결 예정:**
- TypeScript 설정 최적화
- Magic UI 컴포넌트 타입 수정  
- 테스트 환경 설정 개선

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