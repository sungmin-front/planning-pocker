#!/bin/bash

# Planning Poker Docker 환경 정지 스크립트
echo "🛑 Planning Poker Docker 환경을 정지합니다..."

# 컨테이너 정지
echo "⏹️  컨테이너 정지 중..."
docker-compose down

# 선택적 정리 옵션
echo ""
echo "추가 정리 옵션:"
echo "1) 볼륨까지 삭제: docker-compose down --volumes"
echo "2) 이미지까지 삭제: docker-compose down --volumes --rmi all"
echo "3) 전체 정리: docker system prune -a"

echo ""
echo "🏁 Docker 환경 정지 완료!"