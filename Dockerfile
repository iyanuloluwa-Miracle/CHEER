# TippyMe Nuxt — production image (build from repo root)
#   docker build -t tippyme .
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Skip lifecycle scripts: postinstall runs `nuxt prepare`,
# which need the full source tree (not available in this layer).
RUN npm ci --ignore-scripts

FROM node:20-alpine AS build
WORKDIR /app
ARG NUXT_PUBLIC_APP_URL=https://example.com
ARG NUXT_PUBLIC_API_URL=
ENV NUXT_PUBLIC_APP_URL=$NUXT_PUBLIC_APP_URL
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_PUBLIC_API_URL=
RUN addgroup -S tippy && adduser -S tippy -G tippy
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/.output ./.output
USER tippy
EXPOSE 3000
HEALTHCHECK --interval=120s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
