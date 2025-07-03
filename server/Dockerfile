# Node.js 20 Alpine 기반 이미지 사용
FROM node:20-alpine AS base

# pnpm 설치
RUN npm install -g pnpm

# 작업 디렉토리 설정
WORKDIR /app

# workspace 설정 파일들 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# shared 패키지 복사 (dist 포함)
COPY shared ./shared

# server 소스 복사
COPY server/package.json ./server/
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

# 의존성 설치 (workspace 전체)
RUN pnpm install

# shared 패키지 빌드 후 서버 빌드
RUN pnpm --filter @planning-poker/shared build
RUN pnpm --filter @planning-poker/server build

# Production 스테이지
FROM node:20-alpine AS production

# pnpm 설치
RUN npm install -g pnpm

WORKDIR /app

# 필요한 파일들만 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared ./shared
COPY server ./server
# 빌드된 서버 코드 복사
COPY --from=base /app/server/dist ./server/dist

# 프로덕션 의존성 설치 (ts-node 포함)
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @planning-poker/shared build

# ts-node를 root 권한으로 설치
RUN npm install -g ts-node

# 비특권 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S planning-poker -u 1001

# 소유권 변경
RUN chown -R planning-poker:nodejs /app

# 사용자 변경
USER planning-poker

# 포트 노출
EXPOSE 9000

# 작업 디렉토리를 server로 변경
WORKDIR /app/server

# 서버 시작 (컴파일된 JavaScript 실행)
CMD ["node", "dist/server/src/index.js"]