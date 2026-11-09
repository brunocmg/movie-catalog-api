FROM node:24-slim AS base
WORKDIR /app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM deps AS build
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate
COPY --from=build /app/dist ./dist
RUN mkdir -p files && chown node:node files
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
