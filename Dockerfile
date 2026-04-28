# ---------- BASE ----------
FROM node:22.3.0-alpine3.20 AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# ---------- DEPENDENCIAS (DEV) ----------
FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# ---------- BUILD ----------
FROM base AS build-env
COPY . ./
COPY --from=development-dependencies-env /app/node_modules /app/node_modules

RUN pnpm build

# ---------- DEPENDENCIAS (PROD) ----------
FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps ./apps
COPY packages ./packages

RUN pnpm install --prod --frozen-lockfile

# ---------- FINAL ----------
FROM node:22.3.0-alpine3.20
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build

CMD ["pnpm", "start"]