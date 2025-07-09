#!/bin/bash

# Planning Poker 개발 서버 종료 스크립트
echo "🛑 Planning Poker 개발 서버들을 종료합니다..."

# 프로세스 종료
echo "서버 프로세스 종료 중..."
pkill -f "nodemon.*index.ts" 2>/dev/null
pkill -f "node.*index.ts" 2>/dev/null
echo "클라이언트 프로세스 종료 중..."
pkill -f "vite" 2>/dev/null
pkill -f "vite.*4000" 2>/dev/null
pkill -f "vite.*4001" 2>/dev/null
pkill -f "vite.*4002" 2>/dev/null
pkill -f "vite.*4003" 2>/dev/null

sleep 2

# 포트 확인
echo "📊 포트 상태 확인:"
lsof -i :9000 | grep LISTEN && echo "⚠️  서버가 여전히 실행 중" || echo "✅ 서버 종료됨"
lsof -i :4000 | grep LISTEN && echo "⚠️  클라이언트가 여전히 실행 중" || echo "✅ 클라이언트 종료됨"

echo "🏁 개발 서버 종료 완료!"