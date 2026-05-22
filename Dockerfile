FROM node:24
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
