# 🤖 RepoWarden - AI Chief-of-Staff for Open Source Maintainers

[![Kestra](https://img.shields.io/badge/Kestra-Workflows-orange)](https://kestra.io)
[![MCP](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io)
[![Oumi](https://img.shields.io/badge/Oumi-AI-green)](https://oumi.ai)
[![CodeRabbit](https://img.shields.io/badge/CodeRabbit-Integration-purple)](https://coderabbit.ai)

**Tagline:** The AI Chief-of-Staff for Open Source Maintainers

**Mission:** To stop maintainer burnout by automating the "Management Layer" of a repository—triaging issues, mentoring contributors, and writing documentation automatically.

## 🏗️ Architecture Overview

RepoWarden implements a "Split-Brain" system with three key components:

### 1. **The Orchestrator (Kestra)** 🐙
- **Purpose:** Runs in Docker and handles complex, event-driven workflows
- **Port:** `8080` (UI), `8081` (API)
- **Location:** `kestra-flows/` directory with YAML workflow definitions

### 2. **The Interface (MCP Server)** 🔌
- **Purpose:** Node.js server that connects to Cline/VS Code
- **Port:** `3001` (API endpoints)
- **Location:** `backend/mcp-server.js`
- **Tools:** `list_flows`, `get_ranked_prs`, `trigger_flow`, `analyze_code_changes`

### 3. **The Intelligence (Oumi)** 🧠
- **Purpose:** AI model for documentation generation and analysis
- **Location:** `ai-engine/` directory
- **Current Status:** Mock implementation (ready for real Oumi integration)

### 4. **The Analyst (CodeRabbit)** 🔍
- **Purpose:** External sensor for code quality analysis
- **Integration:** Webhooks trigger RepoWarden workflows

## ⚡ The 3 Key Workflows

### 1. **Reactive Ranker** (`coderabbit-ranker.yaml`)
**Trigger:** CodeRabbit AI bot comments on PRs
**Logic:**
- Listens for `@coderabbitai[bot]` comments
- Labels PRs: 🚨 Critical (Security), 🟡 High, 🟢 Low
**Impact:** Turns CodeRabbit into an active workflow participant

### 2. **AI Mentor** (`pr-mentor.yaml`)
**Trigger:** Negative CodeRabbit reviews
**Logic:** "Good Cop / Bad Cop" dynamic
- CodeRabbit: "Hardcoded secret found ❌"
- RepoWarden: "Hey! Here's how to use environment variables instead 💡"
**Impact:** Transforms criticism into teaching moments

### 3. **Docu-Sync Sentinel** (`doc-sync.yaml`)
**Trigger:** PR merged to main branch
**Logic:**
- Fetches the diff of merged changes
- Uses AI to generate documentation updates
- Creates auto-PR with updated README.md
**Impact:** Solves the #1 open source problem - outdated docs

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.8+
- GitHub Personal Access Token (with repo permissions)

### 1. Clone & Setup
```bash
git clone <repository-url>
cd repo-warden-mcp

# Install dependencies
npm run setup
```

### 2. Environment Configuration
```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env with your GitHub token and other settings
```

### 3. Start Kestra (Orchestrator)
```bash
# Start Kestra with PostgreSQL
docker-compose up -d

# Wait for services to be ready
# Kestra UI: http://localhost:8080
```

### 4. Start the Backend & MCP Server
```bash
# Start Express API and MCP server
npm start

# API available at: http://localhost:3001
# Health check: http://localhost:3001/api/health
```

### 5. Start the Frontend (Optional)
```bash
# In another terminal
cd frontend && npm start

# React app at: http://localhost:3000
```

### 6. Configure Cline Integration
The MCP server configuration is already set up in `.cline/mcp.json`. Cline will automatically discover and connect to the RepoWarden MCP server.

## 🛠️ Development

### Running Tests
```bash
# Backend tests
npm test

# Frontend tests
cd frontend && npm test
```

### Adding New Workflows
1. Create new YAML file in `kestra-flows/`
2. Define triggers, tasks, and conditions
3. Test with `docker-compose restart kestra`
4. Update documentation

### Extending MCP Tools
Edit `backend/mcp-server.js` to add new tools:
```javascript
server.tool("new_tool", "Description", schema, handler);
```

## 🔧 Configuration

### Environment Variables (`.env`)
```env
# GitHub API
GITHUB_TOKEN=your_github_token_here

# Kestra API
KESTRA_API_BASE=http://localhost:8080/api/v1

# Oumi AI (Future)
OUMI_API_KEY=your_oumi_key_here
OUMI_ENDPOINT=https://api.oumi.ai/v1

# Repository
DEFAULT_REPO=owner/repo-name
```

### Kestra Configuration
Kestra uses the following configuration:
- **Database:** PostgreSQL (included in docker-compose)
- **Flows:** Auto-loaded from `kestra-flows/` volume
- **Secrets:** Environment variables for API tokens

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - Service health check

### GitHub Integration
- `GET /api/prs/:owner/:repo` - Get ranked PRs for repository

### Workflow Management
- `GET /api/flows` - List Kestra workflows
- `POST /api/flows/:namespace/:flowId/trigger` - Trigger workflow
- `GET /api/executions/:executionId` - Get execution status

### AI Analysis
- `POST /api/analyze-diff` - Analyze code changes for documentation

## 🎯 Usage Examples

### In Cline/VS Code
Once MCP server is connected, you can ask:
- "What is the status of PRs in my repo?"
- "List all available workflows"
- "Trigger the documentation sync workflow"

### Direct API Usage
```bash
# Get ranked PRs
curl "http://localhost:3001/api/prs/octocat/Hello-World"

# List workflows
curl "http://localhost:3001/api/flows"

# Trigger workflow
curl -X POST "http://localhost:3001/api/flows/company.team/coderabbit-ranker/trigger"
```

## 🏆 Competition Wins

This project was designed to win multiple categories:

- **Kestra ($4,000):** Complex event-driven workflows with webhooks
- **Oumi ($3,000):** AI model evaluation on computer security tasks
- **CodeRabbit ($1,000):** Reactive automation on code review events
- **Cline ($5,000):** Full MCP server integration for VS Code control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Kestra](https://kestra.io) for workflow orchestration
- [Model Context Protocol](https://modelcontextprotocol.io) for VS Code integration
- [Oumi](https://oumi.ai) for AI model framework
- [CodeRabbit](https://coderabbit.ai) for code review automation
- [Cline](https://cline.bot) for the AI development experience

---

**Built with ❤️ for the open source community**
