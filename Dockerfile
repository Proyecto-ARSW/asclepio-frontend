FROM node:22.3.0-alpine3.20 AS development-dependencies-env
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22.3.0-alpine3.20 AS production-dependencies-env
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22.3.0-alpine3.20 AS build-env
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY . ./
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN pnpm build

FROM node:22.3.0-alpine3.20
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
CMD ["pnpm", "start"]