# Repository Release Readiness Checker

## Overview
The **Repository Release Readiness Checker** is a backend-focused DevOps analysis platform that evaluates GitHub repositories to determine their readiness for a production release. Built with Node.js and Express, it provides both synchronous and asynchronous (queued) analysis using Docker, Redis, and Google's Gemini AI.

## Features
- Repository health analysis including README quality,Docker presence,test coverage indicators,commit activity,CI/CD config,secret exposure patterns.
- AI-generated release readiness scoring using Google Gemini
- Queue-based asynchronous processing using BullMQ and Redis
- JWT-secured API endpoints
- Persistent report storage and historical filtering

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (with node-postgres)
- **Caching & Message Queue**: Redis, BullMQ
- **AI Integration**: Google Generative AI (Gemini)
- **Containerization**: Docker, Docker Compose
- **Authentication**: JSON Web Tokens (JWT) & bcrypt

## Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (for local development without Docker)
- GitHub Personal Access Token (for higher rate limits)
- Google Gemini API Key (for AI analysis)

## Setup & Installation

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in the required values:
```bash
cp .env.example .env
```

### 2. Running with Docker (Recommended)
You can spin up the entire stack (API, Background Worker, PostgreSQL, and Redis) using Docker Compose:
```bash
docker compose up --build
```

### 3. Local Development
If you prefer running the services locally:
1. Start PostgreSQL and Redis instances.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run database migrations:
   ```bash
   npm run migrate
   ```
4. Start the API and Worker concurrently:
   ```bash
   npm run dev:all
   ```

## API Endpoints
- `GET /health` - Service health check
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login to receive a JWT
- `POST /api/check` - Run a synchronous repository readiness check
- `POST /api/check/async` - Enqueue an asynchronous readiness check
- `GET /api/check/jobs/:jobId` - Check the status of an async job

