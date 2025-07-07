#!/bin/bash

echo "🚀 Planning Poker 개발 서버 시작"
echo ""

# 현재 디렉토리 확인
PROJECT_ROOT="$(pwd)"
echo "프로젝트 경로: $PROJECT_ROOT"

# 기존 프로세스 종료
echo "기존 프로세스 종료 중..."
pkill -f "nodemon.*index.ts" 2>/dev/null
pkill -f "vite.*4000" 2>/dev/null

# 로그 디렉토리 생성
mkdir -p logs

echo ""
echo "개발 서버를 시작하려면 다음 명령어를 별도 터미널에서 실행하세요:"
echo ""
echo "서버 실행:"
echo "  cd /workspace/server && pnpm run dev:fg"
echo ""
echo "클라이언트 실행:"
echo "  cd /workspace/client && pnpm run dev"
echo ""
echo "또는 pnpm 워크스페이스를 사용하여:"
echo "  pnpm --filter server run dev:fg"
echo "  pnpm --filter client run dev"
echo ""