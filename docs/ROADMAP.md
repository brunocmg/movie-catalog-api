# Roadmap

Uma branch por item, cada uma com PR para `main` passando no CI.
Regra para toda branch de feature: migration + testes unitários + **testes e2e do fluxo novo** + Swagger + README atualizados.

## Fase A — Fundação

- [x] **fix/critical-security-and-bugs** — secret fora do log, mensagem de login única, `remove()`, upload (regex/limites), `verifyAsync`/`select`/Bearer, `Logger` no lugar de `console.*`.
- [x] **chore/ci-and-docker** — GitHub Actions (lint, build, unit, e2e com Postgres, build da imagem), Dockerfile multi-stage com `migrate deploy`, compose com healthcheck, README fiel ao que existe.
- [x] **refactor/schema-cleanup** — `createdAt`/`updatedAt` em todas as tabelas, `@map` snake_case consistente, e-mail normalizado em minúsculas, índices, `@@unique([name, year])` em Movie.
- [x] **fix/error-handling** — status corretos no `UsersService` (403 acesso negado, 404 inexistente, 409 e-mail duplicado) sem o try/catch engolir `HttpException`; filtro global sem vazar mensagem do Prisma; 4xx logado como `warn`, não `error`.
- [x] **chore/security-hardening** — `helmet`, CORS por variável de ambiente, `@nestjs/throttler` no login, validação das env vars no boot, remoção de código/deps mortos (`AuthAdminGuard`, `passport*`), imagem Docker mais enxuta.
- [x] **feat/roles-rbac** — `enum Role { USER ADMIN }`; guard carrega o usuário (com role) do banco para `request.user`; `@Roles()` + `RolesGuard` (Reflector); CRUD de filmes só admin; `GET /users` (admin, paginado); checagem de dono em `GET /users/:id`; `GET/PATCH /me`; seed de admin.
- [x] **feat/auth-refresh-token** — `POST /auth/refresh` e `POST /auth/logout`; access 15 min; refresh 7–30 dias com hash no banco e rotação (reuso detectado revoga a família); troca de senha revoga os refresh tokens.
- [x] **chore/structured-logging** — `nestjs-pino` com request id (header `X-Request-Id`), substituindo interceptor/middleware de log.
- [x] **chore/cd-deploy** — `render.yaml`, deploy no Render só depois do CI verde na `main` e verificação pós-deploy.

## Fase B — Domínio principal

- [x] **refactor/title-model** — `Movie` → `Title` com `type` (MOVIE/SERIES), `runtimeMinutes`, `synopsis`, `posterUrl`, `tmdbId` (único, opcional); tabela `Genre` N:N migrando o campo texto atual; `WatchedMovie` → `WatchedTitle`; `/movies` continua funcionando como filtro de Title.
- [x] **feat/series** — `Season` e `Episode` (com `runtimeMinutes`) ligados a Title SERIES; `GET/POST /series`, `/series/:id/seasons`, `/seasons/:id/episodes` (escrita só admin).
- [x] **feat/watch-history** — `PUT/DELETE /me/watched/:titleId`, `GET /me/watched`; `WatchedEpisode` para séries com progresso calculado (x de y episódios).
- [x] **feat/favorites** — `Favorite(userId, titleId, createdAt)`; `PUT/DELETE /me/favorites/:titleId` idempotentes; `GET /me/favorites` paginado com filtro por tipo.
- [x] **feat/watchlist** — mesma estrutura, com `addedAt` e `priority` opcional; marcar como assistido remove da watchlist.
- [x] **feat/tmdb-import** — importação de metadados (sinopse, pôster, gêneros, elenco, duração, temporadas/episódios) pela API do TMDB, só admin.
- [x] **feat/search-and-filters** — `?q=` (índice trigram no Postgres), filtros por gênero, ano e tipo, ordenação.
- [x] **feat/ratings-and-reviews** — nota de 1 a 10 e review opcional, uma por usuário por título; média e contagem no detalhe do título.
- [ ] **feat/stats-and-recommendations** — `GET /me/stats` (total assistido, horas, gêneros favoritos) e recomendações por gênero/nota.

## Fase C — Infra e extras

- [ ] **feat/cloud-storage** — avatar e pôsteres em S3/Cloudinary no lugar do disco local.
- [ ] **feat/caching-and-metrics** — Redis para listagens e detalhes, `/metrics` (Prometheus).
- [ ] **feat/custom-lists** *(opcional)* — listas do usuário, públicas ou privadas.

## Fase D — Front-end

- [ ] **Web app** — React + Vite (ou Next.js) com client tipado gerado do OpenAPI (`openapi-typescript`): catálogo, detalhe, login, minhas listas, histórico e estatísticas.
