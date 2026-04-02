# GitHub Actions Dashboard

A real-time monitoring dashboard for GitHub Actions workflow runs. Track running, queued, and pending workflows across multiple organizations and personal repositories — all in one place.

![GitHub Actions Dashboard](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![Docker](https://img.shields.io/badge/Docker-ready-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Real-time monitoring** — workflow runs refresh every 30 seconds with live duration counters
- **Multi-organization support** — monitor workflows across all your organizations and personal repos
- **Organization & repo filtering** — toggle individual organizations and repositories on/off
- **Expandable run details** — click any run to see individual job statuses
- **Two authentication methods** — GitHub OAuth (App or OAuth App) and Personal Access Token
- **Self-hosted** — single `docker compose up` to deploy on your own infrastructure
- **Dark theme** — GitHub-inspired dark UI

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- A GitHub account

### 1. Clone and configure

```bash
git clone https://github.com/your-username/github-actions-dashboard.git
cd github-actions-dashboard
cp .env.example .env
```

### 2. Run

```bash
docker compose up -d --build
```

Open **http://localhost** and log in with a Personal Access Token.

That's it! OAuth login is optional — see [Authentication](#authentication) below.

> To use a different port: `PORT=8080 docker compose up -d --build`

## Authentication

The dashboard supports two login methods. **Personal Access Token** always works. **GitHub OAuth** requires a one-time setup but provides a smoother login experience.

### Personal Access Token (always available)

Generate a token at [github.com/settings/tokens](https://github.com/settings/tokens) with these scopes:
- `repo` — access to repositories and workflow runs
- `read:org` — list organizations

Paste the token into the dashboard login form.

### GitHub OAuth (optional)

OAuth lets users sign in with one click instead of managing tokens. You can choose between two GitHub OAuth providers:

#### Option A: OAuth App (simpler setup)

1. Go to [Register a new OAuth App](https://github.com/settings/applications/new)
2. Fill in:
   - **Homepage URL** — your dashboard URL (e.g. `http://localhost`)
   - **Authorization callback URL** — same URL (e.g. `http://localhost/`)
3. Copy the **Client ID** and generate a **Client Secret**
4. Edit your `.env`:

```env
AUTH_METHOD=oauth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

5. Restart: `docker compose up -d --build`

> **Note:** OAuth App uses the `repo` scope which grants full repository access. The dashboard only reads data, but the token technically allows write access.

#### Option B: GitHub App (more secure)

1. Go to [Register a new GitHub App](https://github.com/settings/apps/new)
2. Fill in:
   - **Homepage URL** — your dashboard URL
   - **Callback URL** — same URL (e.g. `http://localhost/`)
3. Under **Permissions**, set:
   - Repository: **Actions** — Read-only
   - Repository: **Metadata** — Read-only
   - Organization: **Members** — Read-only
4. Generate a **Client secret**
5. Go to **Install App** and install it into each organization you want to monitor
6. Edit your `.env`:

```env
AUTH_METHOD=github-app
GITHUB_APP_CLIENT_ID=your_client_id
GITHUB_APP_CLIENT_SECRET=your_client_secret
```

7. Restart: `docker compose up -d --build`

> **Note:** GitHub App provides granular read-only permissions but requires installation into each organization.

#### OAuth comparison

| | OAuth App | GitHub App |
|---|---|---|
| Permissions | Broad (`repo` scope) | Granular (read-only) |
| Org access | Automatic (unless org has restrictions) | Requires app installation per org |
| Setup | Simpler | Slightly more complex |
| Security | Token can read & write | Token is read-only |

### No OAuth configured?

If you don't set up OAuth credentials, the dashboard automatically shows only the PAT login. No errors, no broken UI — it just works with tokens.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| State Management | TanStack Query (React Query) v5 |
| Backend | Node.js, Express.js, TypeScript |
| Deployment | Docker, Docker Compose, nginx |
| API | GitHub REST API v3 |

## Architecture

```
Browser
  |
  |  Static files (HTML/JS/CSS)
  v
nginx (port 80) ─── /api/* ───> backend (Express, port 3002)
  |                                  |
  |                                  |  OAuth token exchange
  |                                  v
  |                             GitHub OAuth
  v
React SPA ─── GitHub REST API ───> api.github.com
  (direct from browser with user's token)
```

- **nginx** serves the built frontend and proxies `/api/` requests to the backend
- **backend** handles OAuth token exchange only — it never touches GitHub data directly
- **React SPA** communicates with the GitHub API directly from the browser using the user's token
- All GitHub data stays between the user's browser and GitHub — the backend only sees the OAuth authorization code during login

## Development

For local development without Docker:

### Frontend

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` with hot module replacement.

### Backend

```bash
cd server
npm install
cp .env.example .env
# Optionally fill in OAuth credentials
npm run dev
```

Runs at `http://localhost:3002`.

## API Refresh Strategy

| Data | Cache Duration | Refresh Interval |
|------|---------------|-----------------|
| User profile | 10 min | 10 min |
| Organizations | 10 min | 10 min |
| Repositories | 5 min | 5 min |
| Workflow runs | 15 sec | 30 sec |
| Job details | 20 sec | 30 sec |

## Project Structure

```
├── Dockerfile                 # Multi-stage frontend build (Node → nginx)
├── docker-compose.yml         # Two services: frontend + backend
├── nginx.conf                 # SPA serving + API reverse proxy
├── .env.example               # Environment template
├── src/
│   ├── api/github.ts          # GitHub API client with concurrency limiting
│   ├── components/
│   │   ├── Dashboard.tsx      # Main dashboard with org/repo filtering
│   │   ├── Header.tsx         # Status bar with refresh countdown
│   │   ├── LoginPage.tsx      # Auth tabs (OAuth + PAT)
│   │   ├── OAuthLogin.tsx     # OAuth flow with availability detection
│   │   ├── TokenForm.tsx      # PAT input form
│   │   ├── OrgSelector.tsx    # Organization toggle popover
│   │   ├── RepoCounter.tsx    # Repository toggle popover
│   │   ├── RepoGroup.tsx      # Grouped runs by repository
│   │   ├── RunCard.tsx        # Expandable workflow run card
│   │   ├── JobItem.tsx        # Individual job status
│   │   ├── StatusBadge.tsx    # Status indicator
│   │   └── EmptyState.tsx     # No active runs message
│   ├── hooks/
│   │   ├── useGitHubRuns.ts   # React Query data hooks
│   │   └── useTimer.ts        # Live timer hook
│   ├── utils/
│   │   ├── formatDuration.ts  # Duration formatting
│   │   └── eventLabel.ts      # Event type labels
│   ├── types.ts               # TypeScript interfaces
│   ├── index.css              # Styles (GitHub dark theme)
│   ├── App.tsx                # Root component
│   └── main.tsx               # Entry point
├── server/
│   ├── src/index.ts           # Express API (OAuth token exchange)
│   ├── Dockerfile             # Backend Docker build
│   ├── .env.example           # Backend env template
│   ├── package.json           # Backend dependencies
│   └── tsconfig.json          # Backend TypeScript config
├── package.json               # Frontend dependencies
├── vite.config.ts             # Vite configuration
└── tsconfig.json              # Frontend TypeScript config
```

## License

This project is licensed under the [MIT License](LICENSE).
