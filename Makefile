# Planning Poker - Universal Commands
# Works on Linux, macOS, and Windows (with WSL/Git Bash)

.PHONY: help install start dev build test lint clean setup docker-start docker-stop reset health validate

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)Planning Poker - Available Commands$(NC)"
	@echo "=================================="
	@echo ""
	@echo "$(GREEN)🚀 Quick Start:$(NC)"
	@echo "  make quickstart     - Setup everything and start development"
	@echo "  make quickstart-docker - Setup and start with Docker"
	@echo ""
	@echo "$(GREEN)📦 Setup & Installation:$(NC)"
	@echo "  make setup          - Setup environment files"
	@echo "  make install        - Install dependencies"
	@echo "  make bootstrap      - Complete setup (env + deps)"
	@echo ""
	@echo "$(GREEN)💻 Development:$(NC)"
	@echo "  make start          - Start development servers"
	@echo "  make dev            - Alias for start"
	@echo "  make build          - Build for production"
	@echo ""
	@echo "$(GREEN)🐳 Docker:$(NC)"
	@echo "  make docker-start   - Start with Docker"
	@echo "  make docker-stop    - Stop Docker containers"
	@echo ""
	@echo "$(GREEN)🧪 Quality Assurance:$(NC)"
	@echo "  make test           - Run all tests"
	@echo "  make lint           - Check code quality"
	@echo "  make validate       - Run tests + lint"
	@echo "  make health         - Full health check"
	@echo ""
	@echo "$(GREEN)🔧 Maintenance:$(NC)"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make reset          - Clean + reinstall"
	@echo "  make format         - Format code"
	@echo ""
	@echo "$(YELLOW)First time? Try:$(NC) make quickstart"

## quickstart: Complete setup and start development
quickstart:
	@echo "$(GREEN)🚀 Planning Poker QuickStart$(NC)"
	@echo "============================="
	@make setup
	@make install
	@echo "$(GREEN)✨ Starting development servers...$(NC)"
	@make start

## quickstart-docker: Setup and start with Docker
quickstart-docker:
	@echo "$(GREEN)🐳 Planning Poker Docker QuickStart$(NC)"
	@echo "==================================="
	@make setup
	@echo "$(GREEN)🚀 Starting Docker environment...$(NC)"
	@make docker-start

## setup: Setup environment configuration files
setup:
	@echo "$(BLUE)🔧 Setting up environment files...$(NC)"
	@chmod +x scripts/setup-env.sh
	@./scripts/setup-env.sh
	@echo "$(YELLOW)⚠️  Remember to edit .env files with your actual values!$(NC)"

## install: Install all dependencies
install:
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@pnpm install

## bootstrap: Complete setup (environment + dependencies)
bootstrap:
	@echo "$(GREEN)🎯 Complete Setup$(NC)"
	@echo "=================="
	@make setup
	@make install
	@echo "$(GREEN)✅ Bootstrap complete! Ready to develop.$(NC)"

## start: Start development servers
start:
	@echo "$(GREEN)🚀 Starting development servers...$(NC)"
	@echo "Server: http://localhost:9000"
	@echo "Client: http://localhost:4000"
	@echo "Press Ctrl+C to stop"
	@pnpm run dev

## dev: Alias for start
dev: start

## build: Build for production
build:
	@echo "$(BLUE)🏗️  Building for production...$(NC)"
	@pnpm run build

## test: Run all tests
test:
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	@pnpm run test

## lint: Check code quality
lint:
	@echo "$(BLUE)📝 Checking code quality...$(NC)"
	@pnpm run lint

## validate: Run tests and lint
validate:
	@echo "$(BLUE)✅ Validating code quality and tests...$(NC)"
	@pnpm run validate

## health: Complete health check
health:
	@echo "$(BLUE)🏥 Running health check...$(NC)"
	@pnpm run health

## format: Format code
format:
	@echo "$(BLUE)✨ Formatting code...$(NC)"
	@pnpm run format

## clean: Clean build artifacts
clean:
	@echo "$(BLUE)🧹 Cleaning build artifacts...$(NC)"
	@pnpm run clean

## reset: Clean and reinstall everything
reset:
	@echo "$(YELLOW)🔄 Resetting project...$(NC)"
	@pnpm run clean
	@pnpm install
	@echo "$(GREEN)✅ Reset complete!$(NC)"

## docker-start: Start with Docker
docker-start:
	@echo "$(BLUE)🐳 Starting Docker environment...$(NC)"
	@chmod +x scripts/start-docker.sh
	@./scripts/start-docker.sh
	@echo "$(GREEN)✅ Docker environment started!$(NC)"
	@echo "🌐 Open: http://localhost"

## docker-stop: Stop Docker containers
docker-stop:
	@echo "$(BLUE)🛑 Stopping Docker containers...$(NC)"
	@chmod +x scripts/stop-docker.sh
	@./scripts/stop-docker.sh
	@echo "$(GREEN)✅ Docker environment stopped!$(NC)"

# Check if required tools are installed
check-requirements:
	@echo "$(BLUE)🔍 Checking requirements...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js is required but not installed.$(NC)" >&2; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(RED)❌ pnpm is required but not installed. Run: npm install -g pnpm$(NC)" >&2; exit 1; }
	@echo "$(GREEN)✅ All requirements satisfied!$(NC)"