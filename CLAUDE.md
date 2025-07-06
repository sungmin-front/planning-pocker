# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planning Poker is a real-time Scrum estimation tool with Jira integration. It uses a monorepo structure with pnpm workspaces containing three main packages: client (React), server (Node.js/WebSocket), and shared (TypeScript types).

## Architecture

### Monorepo Structure
- **client/**: React frontend with Vite, TypeScript, Tailwind CSS, and Radix UI components
- **server/**: Node.js WebSocket server with Express API, MongoDB for persistence
- **shared/**: Common TypeScript types and utilities shared between client and server
- **e2e/**: Vitest-based end-to-end tests with WebSocket testing

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, React Router, i18next
- **Backend**: Node.js, Express, WebSocket (ws), MongoDB with Mongoose, Axios for Jira API
- **Testing**: Vitest (client + e2e), Jest (server), Playwright for browser automation
- **Infrastructure**: Docker Compose, Nginx reverse proxy, pnpm workspaces

### WebSocket Communication
The application uses a custom WebSocket manager (`client/src/socket.ts`) that handles:
- Auto-reconnection with exponential backoff
- Room-based message routing
- Type-safe message passing using shared types
- Connection state management through React Context

### Real-time Features
- **Room Management**: Users join rooms with unique IDs, host delegation system
- **Voting System**: Real-time story point estimation with reveal/reset cycles
- **Jira Integration**: Fetch sprints and issues directly into voting sessions
- **Export Functionality**: Session results to JSON/CSV/HTML formats

## Essential Commands

### Development Workflow
```bash
# Quick start (recommended)
pnpm run quickstart              # Setup + install + start dev servers

# Individual development
pnpm run dev                     # Start both client and server
pnpm run dev:client              # Client only (port 4000)  
pnpm run dev:server              # Server only (port 9000)
pnpm run dev:shared              # Watch shared types

# Production setup
pnpm run quickstart:docker       # Docker environment
pnpm run docker:start            # Start Docker services
pnpm run docker:stop             # Stop Docker services
```

### Testing
```bash
# Unit tests
pnpm test                        # All workspaces
pnpm --filter client test        # Client tests (Vitest)
pnpm --filter server test        # Server tests (Jest)

# E2E tests  
pnpm --filter e2e test           # Full E2E suite
pnpm --filter e2e test:room      # Room management tests
pnpm --filter e2e test:voting    # Voting workflow tests

# Specific test files
pnpm --filter client test src/__tests__/VotingInterface.test.tsx
pnpm --filter server test src/__tests__/roomManager.test.ts
```

### Code Quality
```bash
pnpm run lint                    # ESLint all workspaces
pnpm run format                  # Prettier formatting
pnpm run validate                # Tests + linting
pnpm run check                   # TypeScript checking
```

### Build and Deploy
```bash
pnpm run build                   # Build all packages
pnpm run clean                   # Clean build artifacts
pnpm run reset                   # Clean + reinstall
```

## TDD Workflow Requirements

**Always follow this exact sequence for any feature or bug fix:**
1. Write test first (unit/integration/e2e as appropriate)
2. Run test to confirm it fails
3. Write minimal code to make test pass
4. Run test to confirm it passes
5. Refactor if needed while keeping tests green
6. Run Playwright tests for UI changes
7. Commit only after all tests pass

## Development Guidelines

### Code Organization
- **Components**: Use Radix UI primitives with Tailwind styling
- **State Management**: React Context for global state, useState for local state
- **API Calls**: Use the established pattern in `client/src/utils/api.ts`
- **WebSocket**: Always use the singleton instance from `client/src/socket.ts`

### Testing Patterns
- **Client**: Vitest with Testing Library, mock WebSocket connections
- **Server**: Jest with supertest for HTTP endpoints, ws-mock for WebSocket tests
- **E2E**: Vitest with real WebSocket connections to test full workflows

### Environment Setup
- Use `pnpm run setup:env` to generate environment files
- Client connects to server via WebSocket (configurable URL)
- Server connects to MongoDB and optional Jira API
- Nginx handles reverse proxy in Docker environment

### Jira Integration
- Configured via environment variables (BASE_URL, EMAIL, API_TOKEN)
- Fetches sprints and issues through `/api/jira` endpoints
- Issue metadata (title, priority, description) displayed in UI
- Click-through links to original Jira issues

### Debugging Server
When debugging server issues, run server in background mode using the dev script which handles logging and process management.

### Playwright Browser Testing
- Tab indices start from 1, not 0
- Use browser automation for testing complete user workflows
- Test room creation, joining, voting cycles, and host delegation

### Commit Requirements
- All tests must pass before committing
- Include regression tests for bug fixes
- Use conventional commit messages
- Commit changes after completing each task

## Port Configuration
- **Client (dev)**: 4000
- **Server (dev)**: 9000
- **MongoDB**: 27017
- **MongoDB UI**: 3100
- **Nginx (production)**: 80/443

## Workspace Dependencies
Use workspace protocol for internal dependencies:
```json
"@planning-poker/shared": "workspace:*"
```

## Key Files to Understand
- `client/src/contexts/WebSocketContext.tsx` - WebSocket state management
- `server/src/roomManager.ts` - Core room and voting logic
- `shared/src/types.ts` - Type definitions for all communication
- `client/src/contexts/RoomContext.tsx` - Room state and user management
- `server/src/routes/jiraRoutes.ts` - Jira API integration