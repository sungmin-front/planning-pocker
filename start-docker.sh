#!/bin/bash

# Planning Poker Docker 환경 시작 스크립트
echo "🐳 Planning Poker Docker 환경을 시작합니다..."

# .env.docker 파일 확인
if [ ! -f ".env.docker" ]; then
    echo "❌ .env.docker 파일이 없습니다. 환경변수를 확인해주세요."
    exit 1
fi

# 기존 컨테이너 정리
echo "🧹 기존 컨테이너 정리 중..."
docker-compose down --remove-orphans

# 이미지 빌드 및 컨테이너 시작
echo "🏗️  이미지 빌드 중..."
docker-compose --env-file .env.docker build --no-cache

echo "🚀 컨테이너 시작 중..."
docker-compose --env-file .env.docker up -d

# 서비스 상태 확인
echo "⏳ 서비스 시작 대기 중..."
sleep 10

echo "📊 컨테이너 상태 확인:"
docker-compose ps

echo ""
echo "🌐 서비스 접속 정보:"
echo "  📱 Planning Poker: http://localhost"
echo "  🔍 API Health Check: http://localhost/health"
echo "  📋 API Docs: http://localhost/api"

echo ""
echo "🔧 유용한 명령어:"
echo "  로그 확인: docker-compose logs -f [서비스명]"
echo "  컨테이너 중지: docker-compose down"
echo "  전체 정리: docker-compose down --volumes --remove-orphans"

echo ""
echo "🎉 Docker 환경 시작 완료!"