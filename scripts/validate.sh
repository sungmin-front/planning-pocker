#!/bin/bash

# Planning Poker Validation Script
# Checks project health and configuration

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════╗"
    echo "║   Planning Poker Validation      ║"
    echo "╚══════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}🔍 $1${NC}"
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

# Check environment files
check_env_files() {
    print_step "Checking environment files..."
    
    local files=(".env" "server/.env" "client/.env" ".env.docker")
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_success "All environment files exist"
    else
        print_warning "Missing environment files: ${missing_files[*]}"
        echo "Run: npm run setup:env"
        return 1
    fi
}

# Check if environment files have been configured
check_env_configuration() {
    print_step "Checking environment configuration..."
    
    if [ -f ".env" ]; then
        if grep -q "your-domain.atlassian.net" .env; then
            print_warning "Environment files contain placeholder values"
            echo "Please edit .env files with your actual Jira credentials"
            return 1
        else
            print_success "Environment files appear to be configured"
        fi
    fi
}

# Check dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies not installed"
        echo "Run: pnpm install"
        return 1
    fi
    
    # Check if all workspaces have dependencies
    local workspaces=("client" "server" "shared")
    for workspace in "${workspaces[@]}"; do
        if [ ! -d "$workspace/node_modules" ]; then
            print_warning "$workspace dependencies not installed"
            echo "Run: pnpm install"
            return 1
        fi
    done
    
    print_success "All dependencies installed"
}

# Check ports availability
check_ports() {
    print_step "Checking port availability..."
    
    local ports=(4000 9000 80)
    local busy_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            busy_ports+=("$port")
        fi
    done
    
    if [ ${#busy_ports[@]} -eq 0 ]; then
        print_success "Required ports are available"
    else
        print_warning "Ports in use: ${busy_ports[*]}"
        echo "You may need to stop other services or use different ports"
    fi
}

# Check system requirements
check_system_requirements() {
    print_step "Checking system requirements..."
    
    # Node.js version
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js version: $NODE_VERSION"
        else
            print_error "Node.js 18+ required. Current: $NODE_VERSION"
            return 1
        fi
    else
        print_error "Node.js not found"
        return 1
    fi
    
    # pnpm
    if command -v pnpm >/dev/null 2>&1; then
        PNPM_VERSION=$(pnpm -v)
        print_success "pnpm version: $PNPM_VERSION"
    else
        print_warning "pnpm not found. Install with: npm install -g pnpm"
    fi
    
    # Docker (optional)
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker version: $DOCKER_VERSION"
    else
        print_warning "Docker not found (optional for development)"
    fi
}

# Run linting
run_lint() {
    print_step "Running code quality checks..."
    
    if pnpm run lint >/dev/null 2>&1; then
        print_success "Code quality checks passed"
    else
        print_warning "Code quality issues found"
        echo "Run: pnpm run lint (to see details)"
        return 1
    fi
}

# Run tests
run_tests() {
    print_step "Running tests..."
    
    if pnpm run test >/dev/null 2>&1; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed"
        echo "Run: pnpm run test (to see details)"
        return 1
    fi
}

# Generate health report
generate_report() {
    local total_checks=7
    local passed_checks=0
    
    echo ""
    print_header
    
    # Run all checks
    check_system_requirements && ((passed_checks++)) || true
    check_env_files && ((passed_checks++)) || true
    check_env_configuration && ((passed_checks++)) || true
    check_dependencies && ((passed_checks++)) || true
    check_ports && ((passed_checks++)) || true
    run_lint && ((passed_checks++)) || true
    run_tests && ((passed_checks++)) || true
    
    echo ""
    echo "╔══════════════════════════════════╗"
    echo "║            SUMMARY               ║"
    echo "╚══════════════════════════════════╝"
    
    if [ $passed_checks -eq $total_checks ]; then
        print_success "Project health: EXCELLENT ($passed_checks/$total_checks)"
        echo "🚀 Ready for development!"
    elif [ $passed_checks -ge 5 ]; then
        print_warning "Project health: GOOD ($passed_checks/$total_checks)"
        echo "⚡ Some minor issues found, but ready to start"
    else
        print_error "Project health: NEEDS ATTENTION ($passed_checks/$total_checks)"
        echo "🔧 Please fix the issues above before proceeding"
        exit 1
    fi
}

# Main function
main() {
    if [ "$1" = "--quick" ]; then
        # Quick validation (skip tests)
        check_system_requirements
        check_env_files
        check_dependencies
        print_success "Quick validation passed!"
    else
        # Full validation
        generate_report
    fi
}

main "$@"