# TippyMe Nuxt web — production image (build from monorepo root)
#   docker build -f apps/web/Dockerfile -t tippyme-web .
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci -w @cheer/web --include-workspace-root=false

FROM node:20-alpine AS build
WORKDIR /app
ARG NUXT_PUBLIC_APP_URL=https://example.com
ARG NUXT_PUBLIC_API_URL=
ARG API_INTERNAL_URL=http://api:3001
ENV NUXT_PUBLIC_APP_URL=$NUXT_PUBLIC_APP_URL
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NUXT_PUBLIC_API_PROXY_TARGET=$API_INTERNAL_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# Runtime overrides for Nitro / Nuxt public config (no secrets here).
ENV NUXT_PUBLIC_API_URL=
ENV API_INTERNAL_URL=http://api:3001
ENV NUXT_PUBLIC_API_PROXY_TARGET=http://api:3001
RUN addgroup -S tippy && adduser -S tippy -G tippy
COPY --from=build /app/apps/web/.output ./.output
COPY --from=build /app/apps/web/package.json ./package.json
USER tippy
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1
CMD ["node", ".output/server/index.mjs"]
