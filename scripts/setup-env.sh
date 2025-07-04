#!/bin/bash

# Planning Poker 환경변수 설정 헬퍼 스크립트
echo "🔧 Planning Poker 환경변수 설정을 시작합니다..."

# 함수: 환경변수 파일 생성
create_env_file() {
    local target_file=$1
    local description=$2
    local content=$3

    if [ ! -f "$target_file" ]; then
        echo "$content" > "$target_file"
        echo "✅ $description 생성: $target_file"
    else
        echo "⚠️  이미 존재합니다: $target_file"
    fi
}

echo ""
echo "📁 환경변수 파일 생성 중..."

# 루트 환경변수 (.env)
ROOT_ENV_CONTENT="# Planning Poker 환경변수 설정
# 이 파일을 편집하여 실제 값으로 변경하세요

# Backend Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token-here
JIRA_DEFAULT_PROJECT_KEY=YOUR_PROJECT_KEY

# Server Configuration  
PORT=9000"

create_env_file ".env" "루트 환경변수 파일" "$ROOT_ENV_CONTENT"

# 서버 환경변수 (server/.env)
SERVER_ENV_CONTENT="# Planning Poker 서버 환경변수 설정
# 이 파일을 편집하여 실제 값으로 변경하세요

# Backend Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token-here
JIRA_DEFAULT_PROJECT_KEY=YOUR_PROJECT_KEY

# Server Configuration  
PORT=9000"

create_env_file "server/.env" "서버 환경변수 파일" "$SERVER_ENV_CONTENT"

# 클라이언트 환경변수 (client/.env)
CLIENT_ENV_CONTENT="# Planning Poker 클라이언트 환경변수 설정
# 이 파일을 편집하여 실제 값으로 변경하세요

# WebSocket and API Configuration
VITE_WEBSOCKET_URL=ws://localhost:9000
VITE_API_BASE_URL=http://localhost:9000"

create_env_file "client/.env" "클라이언트 환경변수 파일" "$CLIENT_ENV_CONTENT"

# Docker 환경변수 (.env.docker)
DOCKER_ENV_CONTENT="# Planning Poker Docker 환경변수 설정
# 이 파일을 편집하여 실제 값으로 변경하세요

# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token-here
JIRA_DEFAULT_PROJECT_KEY=YOUR_PROJECT_KEY

# Client Build Environment Variables (Docker 환경용)
VITE_API_BASE_URL=http://localhost/api
VITE_WEBSOCKET_URL=ws://localhost"

create_env_file ".env.docker" "Docker 환경변수 파일" "$DOCKER_ENV_CONTENT"

echo ""
echo "🔑 Jira API 토큰 생성 방법:"
echo "1. https://id.atlassian.com/manage-profile/security/api-tokens 접속"
echo "2. 'Create API token' 클릭"
echo "3. 토큰 이름 입력 후 생성"
echo "4. 생성된 토큰을 환경변수 파일에 복사"

echo ""
echo "📝 설정이 필요한 환경변수 파일들:"
echo "  📄 .env - 개발 환경용"
echo "  📄 server/.env - 서버 전용"
echo "  📄 client/.env - 클라이언트 전용"
echo "  📄 .env.docker - Docker 환경용"

echo ""
echo "⚠️  중요: 실제 값으로 변경해야 할 항목들:"
echo "  - JIRA_BASE_URL: 당신의 Jira 도메인"
echo "  - JIRA_EMAIL: 당신의 Jira 이메일"
echo "  - JIRA_API_TOKEN: 생성한 API 토큰"
echo "  - JIRA_DEFAULT_PROJECT_KEY: 프로젝트 키"

echo ""
echo "🚀 설정 완료 후 실행 방법:"
echo "  개발 환경: pnpm run dev"
echo "  Docker 환경: ./start-docker.sh"

echo ""
echo "✨ 환경변수 설정 헬퍼 완료!"