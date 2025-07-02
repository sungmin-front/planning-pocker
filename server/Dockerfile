# Node.js 20 Alpine 기반 이미지 사용
FROM node:20-alpine AS base

# pnpm 설치
RUN npm install -g pnpm

# 작업 디렉토리 설정
WORKDIR /app

# workspace 설정 파일들 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# shared 패키지 복사
COPY shared ./shared

# server 소스 복사
COPY server/package.json ./server/
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

# 의존성 설치 (workspace 전체)
RUN pnpm install

# shared 패키지 빌드
RUN pnpm --filter @planning-poker/shared build

# 서버 빌드 (테스트 파일 제외)  
RUN cd server && pnpm run build

# Production 스테이지
FROM node:20-alpine AS production

# pnpm 설치
RUN npm install -g pnpm

WORKDIR /app

# 필요한 파일들만 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
COPY --from=base /app/shared/dist ./shared/dist
COPY server/package.json ./server/
COPY --from=base /app/server/dist ./server/dist

# 프로덕션 의존성만 설치
RUN pnpm install --prod --frozen-lockfile

# 비특권 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S planning-poker -u 1001

# 사용자 변경
USER planning-poker

# 포트 노출
EXPOSE 9000

# 작업 디렉토리를 server로 변경
WORKDIR /app/server

# 서버 시작
CMD ["node", "dist/index.js"]