# 🎬 Movie Catalog API

A RESTful API for managing a movie catalog and its users, built with NestJS and TypeScript. Users can register, authenticate, browse movies and track which ones they've watched.

[![CI](https://github.com/brunocmg/movie-catalog-api/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/brunocmg/movie-catalog-api/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Running Tests](#-running-tests)
- [CI](#-ci)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ Features

- ✅ CRUD for movies with pagination (unique per name + year)
- ✅ User registration, update, deletion and avatar upload (JPEG/PNG, max 3 MB)
- ✅ JWT authentication (Bearer) with password hashing (bcrypt)
- ✅ Case-insensitive e-mails (normalized to lower case)
- ✅ Audit timestamps (`created_at` / `updated_at`) and snake_case columns
- ✅ Generic login error and constant-time comparison to avoid user enumeration
- ✅ Guard that re-checks on every request that the user still exists and is active
- ✅ DTO validation with class-validator / class-transformer
- ✅ Consistent error responses: 403/404/409 where they belong, no database details leaked, unexpected errors logged with stack trace
- ✅ Request logging with interceptors and Nest `Logger`
- ✅ Security headers (helmet), configurable CORS and rate limiting (stricter on login and sign-up)
- ✅ Environment validated at boot: the app refuses to start with a clear message
- ✅ Swagger / OpenAPI documentation
- ✅ Health check with database probe
- ✅ Idempotent database seed
- ✅ Unit and E2E tests (E2E boot the real `AppModule` with the production pipes and filters)
- ✅ Multi-stage Docker image (runs `prisma migrate deploy` on start)
- ✅ GitHub Actions CI (lint, build, unit, E2E with Postgres, Docker build)

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| NestJS 11 | Framework |
| TypeScript | Language |
| Prisma 7 | ORM and migrations |
| PostgreSQL 15 | Database |
| JWT | Authentication |
| bcrypt | Password hashing |
| Jest + Supertest | Unit and E2E tests |
| Swagger | API documentation |
| Docker / Compose | Containerization |
| GitHub Actions | Continuous integration |

---

## 🗄 Database Schema

```mermaid
erDiagram
  users ||--o{ watched_movies : watches
  movies ||--o{ watched_movies : "watched by"
  users {
    int id PK
    text name
    text email UK "lower-cased"
    text password_hash
    boolean active
    text avatar
    timestamp created_at
    timestamp updated_at
  }
  movies {
    int id PK
    text name "unique with year"
    text genre
    text director
    int year
    timestamp created_at
    timestamp updated_at
  }
  watched_movies {
    int user_id PK,FK
    int movie_id PK,FK
    timestamp watched_at
  }
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24
- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/brunocmg/movie-catalog-api.git
cd movie-catalog-api
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in the values in `.env` (see [Environment Variables](#-environment-variables)).

### 3a. Run with Docker (recommended)

```bash
docker compose up --build
```

Compose waits for Postgres to be healthy, applies the migrations and starts the API in watch mode (hot reload) at `http://localhost:3000`.

> After changing dependencies, recreate the container with fresh `node_modules`: `docker compose up --build -V app`.

Seed the database (optional):

```bash
docker compose exec app npx prisma db seed
```

### 3b. Run locally (without Docker for the API)

```bash
docker compose up -d db
npm install
npx prisma migrate deploy
npx prisma db seed   # optional
npm run start:dev
```

> When running outside Docker, `DATABASE_URL` must point to `localhost` instead of `db`.

### Production image

```bash
docker build --target prod -t movie-catalog-api .
docker run --env-file .env -p 3000:3000 movie-catalog-api
```

---

## 🔐 Environment Variables

All variables are validated when the app starts ([env.validation.ts](./src/config/env.validation.ts)). A missing or invalid value stops the boot with a message listing every problem. See [.env.example](./.env.example).

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | | `postgresql://` connection string |
| `JWT_SECRET` | ✅ | | At least 32 characters (`openssl rand -base64 48`) |
| `JWT_TOKEN_AUDIENCE` / `JWT_TOKEN_ISSUER` | ✅ | | JWT `aud` / `iss` claims |
| `JWT_TTL` | ✅ | | Token lifetime: `900`, `15m`, `1h`, `7d` |
| `NODE_ENV` | | `development` | `development`, `production` or `test` |
| `PORT` | | `3000` | HTTP port |
| `SWAGGER_ENABLED` | | `true` | Serve the docs at `/docs` |
| `CORS_ORIGINS` | | | `*` or a comma-separated list. Unset: any origin in development, disabled in production |
| `TRUST_PROXY` | | `0` | Proxies in front of the app (`1` on Render), so rate limiting sees the real IP |
| `THROTTLE_TTL_MS` | | `60000` | Rate-limit window |
| `THROTTLE_LIMIT` | | `100` | Requests per window, any route |
| `THROTTLE_AUTH_LIMIT` | | `5` | Login / sign-up attempts per window |

`DB_USER`, `DB_PASSWORD` and `DB_NAME` are only used by docker compose to create the database.

For E2E tests, create a `.env.test` with the same JWT variables and a `DATABASE_URL` pointing to a **separate** database — the tests wipe every table.

---

## 📚 API Documentation

Swagger UI is available at `http://localhost:3000/docs`.

![Swagger](./docs/images/swagger.png)

### Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth` | Login and get an access token | ❌ |
| GET | `/movies` | List movies (`?limit=&offset=`) | ❌ |
| GET | `/movies/:id` | Get movie by ID | ❌ |
| POST | `/movies` | Create a movie | ✅ |
| PATCH | `/movies/:id` | Update a movie | ✅ |
| DELETE | `/movies/:id` | Delete a movie (`204`) | ✅ |
| POST | `/users` | Register a user | ❌ |
| GET | `/users/:id` | Get user by ID | ✅ |
| PATCH | `/users/:id` | Update own name/password | ✅ |
| DELETE | `/users/:id` | Delete own user (`204`) | ✅ |
| POST | `/users/upload` | Upload own avatar | ✅ |
| GET | `/files/:name` | Serve uploaded avatars | ❌ |
| GET | `/health` | Health check | ❌ |

### Error format

Every error has the same shape:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A movie with this name and year already exists",
  "path": "/movies",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

| Status | When |
|---|---|
| `400` | Invalid body, query or id |
| `401` | Missing, invalid or expired token |
| `403` | Changing another user's account |
| `404` | Resource not found |
| `409` | Duplicated e-mail or movie (name + year) |
| `429` | Too many requests (login and sign-up: 5 per minute per IP) |
| `413` / `422` | Avatar too large / wrong type |
| `500` | Unexpected error (details only in the server log) |

---

## 📁 Project Structure

```
src/
├── main.ts
├── app/          # root module
├── auth/         # login, JWT config, guard, hashing
├── users/
├── movies/
├── prisma/       # PrismaService
├── health/
└── common/       # filters, guards, interceptors, middlewares
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
test/             # E2E tests and Jest setup
```

---

## 🧪 Running Tests

```bash
# Unit tests
npm test

# E2E tests (needs a running Postgres; migrations are applied automatically)
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 🔄 CI

Every pull request and every push to `main` runs on GitHub Actions:

1. `npm ci` + `prisma generate`
2. ESLint
3. Build
4. Unit tests
5. E2E tests against a Postgres service container
6. Production Docker image build

---

## 🗺 Roadmap

Highlights (full branch-by-branch plan in [docs/ROADMAP.md](./docs/ROADMAP.md)):

- [ ] Role-based access control (`USER` / `ADMIN`)
- [ ] Refresh tokens with rotation and logout
- [ ] Structured logging with request id and continuous deployment
- [ ] Series, seasons and episodes (genres as a proper relation)
- [ ] Watch history, favorites and watchlist
- [ ] TMDB metadata import
- [ ] Search, filters and sorting
- [ ] Ratings, reviews, stats and recommendations
- [ ] Cloud storage, caching and metrics
- [ ] Web front end

---

## 🌐 Deploy

Live API: https://movie-catalog-api-54m7.onrender.com/docs

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
