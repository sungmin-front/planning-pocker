# Node.js 20 Alpine 기반 이미지 사용
FROM node:20-alpine AS base

# pnpm 설치
RUN npm install -g pnpm

# 작업 디렉토리 설정
WORKDIR /app

# 루트의 package.json과 pnpm-lock.yaml 복사 (workspace 설정)
COPY ../package.json ../pnpm-lock.yaml ./

# shared 패키지 복사
COPY ../shared ./shared

# client 소스 복사
COPY package.json ./client/
COPY src ./client/src
COPY public ./client/public
COPY index.html ./client/
COPY vite.config.ts ./client/
COPY tsconfig.json ./client/
COPY tsconfig.node.json ./client/
COPY tailwind.config.js ./client/
COPY postcss.config.js ./client/

# 빌드 시 환경변수 설정
ARG VITE_API_BASE_URL=http://localhost/api
ARG VITE_WEBSOCKET_URL=ws://localhost

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL

# 의존성 설치 (workspace 전체)
RUN pnpm install

# shared 패키지 빌드
RUN cd shared && pnpm run build

# 클라이언트 빌드
RUN cd client && pnpm run build

# Nginx 기반 프로덕션 스테이지
FROM nginx:alpine AS production

# 빌드된 정적 파일 복사
COPY --from=base /app/client/dist /usr/share/nginx/html

# 기본 nginx 설정 제거
RUN rm /etc/nginx/conf.d/default.conf

# 커스텀 nginx 설정 추가
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# nginx 시작
CMD ["nginx", "-g", "daemon off;"]