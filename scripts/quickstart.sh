#!/bin/bash

# Planning Poker QuickStart Script
# Automates the complete setup process for new users

set -e  # Exit on error

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════╗"
    echo "║      Planning Poker Setup        ║"
    echo "║    Real-time Scrum Tool          ║"
    echo "╚══════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if required tools are installed
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed."
        echo "Please install Node.js 18+ from: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "18" ]; then
        print_error "Node.js 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm not found. Installing pnpm..."
        npm install -g pnpm
    fi
    
    print_success "System requirements satisfied!"
}

# Main setup function
main() {
    print_header
    
    echo "Welcome to Planning Poker! This script will set up everything for you."
    echo ""
    
    # Ask user for setup preference
    echo "Choose your setup method:"
    echo "1) Development environment (recommended for development)"
    echo "2) Docker environment (recommended for production/testing)"
    echo "3) Skip to manual setup"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            setup_development
            ;;
        2)
            setup_docker
            ;;
        3)
            manual_setup
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
}

# Development environment setup
setup_development() {
    print_step "Setting up development environment..."
    
    check_requirements
    
    # Setup environment files
    print_step "Creating environment configuration files..."
    chmod +x scripts/setup-env.sh
    ./scripts/setup-env.sh
    
    # Install dependencies
    print_step "Installing dependencies..."
    pnpm install
    
    print_success "Development environment setup complete!"
    echo ""
    print_warning "IMPORTANT: Edit the .env files with your actual Jira credentials:"
    echo "  📄 .env (root)"
    echo "  📄 server/.env"
    echo "  📄 client/.env"
    echo ""
    echo "🔑 Get your Jira API token from:"
    echo "   https://id.atlassian.com/manage-profile/security/api-tokens"
    echo ""
    echo "🚀 After configuring .env files, start development with:"
    echo "   pnpm start   or   make start"
    echo ""
}

# Docker environment setup
setup_docker() {
    print_step "Setting up Docker environment..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is required but not installed."
        echo "Please install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Setup environment files
    print_step "Creating environment configuration files..."
    chmod +x scripts/setup-env.sh
    ./scripts/setup-env.sh
    
    print_success "Docker environment setup complete!"
    echo ""
    print_warning "IMPORTANT: Edit the Docker environment file:"
    echo "  📄 .env.docker"
    echo ""
    echo "🔑 Get your Jira API token from:"
    echo "   https://id.atlassian.com/manage-profile/security/api-tokens"
    echo ""
    echo "🚀 After configuring .env.docker, start with:"
    echo "   pnpm run docker:start   or   make docker-start"
    echo ""
}

# Manual setup (just create env files)
manual_setup() {
    print_step "Creating environment template files..."
    
    chmod +x scripts/setup-env.sh
    ./scripts/setup-env.sh
    
    print_success "Environment template files created!"
    echo ""
    echo "📚 Next steps:"
    echo "1. Edit .env files with your actual values"
    echo "2. Install dependencies: pnpm install"
    echo "3. Start development: pnpm start"
    echo ""
    echo "📖 See README.md for detailed instructions"
}

# Run main function
main "$@"