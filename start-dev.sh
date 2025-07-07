#!/bin/bash

# Planning Poker 개발 서버 백그라운드 시작 스크립트
echo "🚀 Planning Poker 개발 서버들을 백그라운드에서 시작합니다..."

# 기존 프로세스 종료
echo "기존 프로세스 종료 중..."
pkill -f "nodemon.*index.ts" 2>/dev/null
pkill -f "vite.*4000" 2>/dev/null
sleep 2

# 프로젝트 루트 디렉토리 설정 (현재 디렉토리 기준)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 로그 디렉토리 생성
mkdir -p "$PROJECT_ROOT/logs"

# 서버 시작 (포트 9000)
echo "📡 서버 시작 중... (포트 9000)"
cd "$PROJECT_ROOT/server" && nohup pnpm run dev:fg > "$PROJECT_ROOT/logs/server.log" 2>&1 &
SERVER_PID=$!

# 클라이언트 시작 (포트 4000)  
echo "🌐 클라이언트 시작 중... (포트 4000)"
cd "$PROJECT_ROOT/client" && nohup pnpm run dev > "$PROJECT_ROOT/logs/client.log" 2>&1 &
CLIENT_PID=$!

# 서버들이 시작될 때까지 대기
echo "⏳ 서버들이 시작될 때까지 대기 중..."
sleep 5

# 포트 확인
echo "📊 포트 상태 확인:"
netstat -tln 2>/dev/null | grep ":9000 " && echo "✅ 서버가 포트 9000에서 실행 중" || echo "❌ 서버 시작 실패"
netstat -tln 2>/dev/null | grep ":4000 " && echo "✅ 클라이언트가 포트 4000에서 실행 중" || echo "❌ 클라이언트 시작 실패"

echo ""
echo "🎉 개발 서버 시작 완료!"
echo "🌐 클라이언트: http://localhost:4000"
echo "📡 서버: http://localhost:9000"
echo ""
echo "📄 로그 확인:"
echo "  서버 로그: tail -f logs/server.log"
echo "  클라이언트 로그: tail -f logs/client.log"
echo ""
echo "🛑 서버 종료: ./stop-dev.sh"