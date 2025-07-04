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

# client 소스 복사
COPY client/package.json ./client/
COPY client/src ./client/src
COPY client/public ./client/public
COPY client/index.html ./client/
COPY client/vite.config.ts ./client/
COPY client/tsconfig.json ./client/
COPY client/tsconfig.docker.json ./client/
COPY client/tailwind.config.js ./client/
COPY client/postcss.config.js ./client/
COPY client/components.json ./client/

# 빌드 시 환경변수 설정 - 비워둬서 동적 URL 생성되도록 함
ARG VITE_API_BASE_URL=
ARG VITE_WEBSOCKET_URL=

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL

# 의존성 설치 (workspace 전체)
RUN pnpm install

# shared 패키지 빌드
RUN pnpm --filter @planning-poker/shared build

# 클라이언트 빌드 (TypeScript 검사 우회, Vite만 사용)
RUN cd client && cp tsconfig.docker.json tsconfig.json && pnpm exec vite build

# Nginx 기반 프로덕션 스테이지
FROM nginx:alpine AS production

# 빌드된 정적 파일 복사
COPY --from=base /app/client/dist /usr/share/nginx/html

# 기본 nginx 설정 제거
RUN rm /etc/nginx/conf.d/default.conf

# 커스텀 nginx 설정 추가
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# nginx 시작
CMD ["nginx", "-g", "daemon off;"]