# 🚀 Getting Started with Planning Poker

Welcome to Planning Poker! This guide will help you get up and running quickly.

## 🔥 Super Quick Start (Recommended)

**For first-time users:**

```bash
# 1. Clone the repository
git clone <repository-url>
cd planning-poker

# 2. One-click setup and start! 🚀
pnpm run quickstart
```

That's it! The application will automatically:
- ✅ Set up environment files
- ✅ Install all dependencies  
- ✅ Start the development servers
- ✅ Open in your browser at http://localhost:4000

## 🐳 Docker Quick Start

**For production or isolated environments:**

```bash
# 1. Clone and setup
git clone <repository-url>
cd planning-poker

# 2. Docker one-click start! 🐳
pnpm run quickstart:docker
```

Access at: http://localhost

## 📋 What You Need

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - For cloning the repository
- **Docker** (optional) - For Docker deployment

## 🔑 Jira Integration Setup

After the initial setup, you'll need to configure Jira integration:

### 1. Get Your Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Enter a label (e.g., "Planning Poker")
4. Copy the generated token

### 2. Configure Environment Variables

Edit these files with your actual Jira details:

**For Development (.env):**
```bash
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token-here
JIRA_DEFAULT_PROJECT_KEY=YOUR_PROJECT
```

**For Docker (.env.docker):**
```bash
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token-here
JIRA_DEFAULT_PROJECT_KEY=YOUR_PROJECT
```

## 🎯 Next Steps

1. **Create a Room**: Click "새 룸 만들기" (Create New Room)
2. **Add Stories**: Use the "+" button or import from Jira
3. **Start Voting**: Select a story and click "Start Voting"
4. **Invite Team**: Share the room URL with your team
5. **Export Results**: Use the Export button for session reports

## 🛠️ Useful Commands

| Task | Command | Description |
|------|---------|-------------|
| **Start Development** | `pnpm start` | Start dev servers |
| **Check Health** | `pnpm run validate` | Verify everything works |
| **Run Tests** | `pnpm test` | Run all tests |
| **Clean Install** | `pnpm run reset` | Clean and reinstall |
| **Docker Start** | `pnpm run docker:start` | Start Docker environment |
| **Get Help** | `make help` | Show all available commands |

## 🆘 Troubleshooting

### Common Issues:

**Port already in use:**
```bash
# Check what's using the port
lsof -i :4000
lsof -i :9000

# Kill the process or change ports in .env files
```

**Dependencies issues:**
```bash
# Clean reinstall
pnpm run reset
```

**Permission errors:**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

**Validation fails:**
```bash
# Check project health
pnpm run validate

# Quick health check
./scripts/validate.sh --quick
```

### Need Help?

1. **Check logs**: Look in `logs/` directory
2. **Validate setup**: Run `npm run validate`
3. **Restart clean**: Run `npm run reset`
4. **Check documentation**: See README.md
5. **Create an issue**: On the GitHub repository

## 🌟 Features Overview

- **Real-time Voting**: WebSocket-based live collaboration
- **Jira Integration**: Import stories directly from Jira sprints
- **Export Options**: Download results as JSON, CSV, or HTML
- **Multi-language**: Support for Korean and English
- **Mobile-friendly**: Responsive design for all devices
- **Host Controls**: Easy story management and delegation
- **Statistics**: Detailed voting analytics and charts

## 🎉 You're Ready!

Congratulations! You now have Planning Poker running. Start by creating your first room and inviting your team to begin estimating story points together.

**Happy Planning! 🚀**