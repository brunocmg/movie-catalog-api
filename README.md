# 🎬 Movie Catalog API

A RESTful API for managing a movie catalog and its users, built with NestJS and TypeScript. Users can register, authenticate, browse movies and track which ones they've watched.

[![CI](https://github.com/brunocmg/api-rest-filmes/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/brunocmg/api-rest-filmes/actions/workflows/ci.yml)
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

- ✅ CRUD for movies with pagination
- ✅ User registration, update, deletion and avatar upload (JPEG/PNG, max 3 MB)
- ✅ JWT authentication (Bearer) with password hashing (bcrypt)
- ✅ Generic login error and constant-time comparison to avoid user enumeration
- ✅ Guard that re-checks on every request that the user still exists and is active
- ✅ DTO validation with class-validator / class-transformer
- ✅ Global exception filter (including Prisma errors → 404/409)
- ✅ Request logging with interceptors and Nest `Logger`
- ✅ Swagger / OpenAPI documentation
- ✅ Health check with database probe
- ✅ Idempotent database seed
- ✅ Unit and E2E tests
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

![Database Schema](./docs/images/db-schema.png)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24
- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/brunocmg/api-rest-filmes.git
cd api-rest-filmes
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

Compose waits for Postgres to be healthy, applies the migrations and starts the API in watch mode at `http://localhost:3000`.

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

```env
# Database
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=catalog
DATABASE_URL="postgresql://postgres:your_db_password@localhost:5432/catalog"

# JWT
JWT_SECRET=generate_a_long_random_value   # e.g. openssl rand -base64 48
JWT_TOKEN_AUDIENCE=http://localhost:3000
JWT_TOKEN_ISSUER=http://localhost:3000
JWT_TTL="1h"

# App
NODE_ENV=development
PORT=3000
```

For E2E tests, create a `.env.test` with the same JWT variables and a `DATABASE_URL` pointing to a **separate** database — the tests wipe the users table.

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
| DELETE | `/movies/:id` | Delete a movie | ✅ |
| POST | `/users` | Register a user | ❌ |
| GET | `/users/:id` | Get user by ID | ✅ |
| PATCH | `/users/:id` | Update own user | ✅ |
| DELETE | `/users/:id` | Delete own user | ✅ |
| POST | `/users/upload` | Upload own avatar | ✅ |
| GET | `/files/:name` | Serve uploaded avatars | ❌ |
| GET | `/health` | Health check | ❌ |

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

Every pull request and every push to `develop`/`main` runs on GitHub Actions:

1. `npm ci` + `prisma generate`
2. ESLint
3. Build
4. Unit tests
5. E2E tests against a Postgres service container
6. Production Docker image build

---

## 🗺 Roadmap

- [ ] Role-based access control (`USER` / `ADMIN`)
- [ ] Refresh tokens with rotation and logout
- [ ] Series, seasons and episodes
- [ ] Watch history, favorites and watchlist
- [ ] Genres, search, filters and sorting
- [ ] Ratings and reviews
- [ ] TMDB metadata import
- [ ] Cloud storage for images
- [ ] Caching and observability
- [ ] Web front end

---

## 🌐 Deploy

Live API: https://movie-catalog-api-54m7.onrender.com/docs

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
