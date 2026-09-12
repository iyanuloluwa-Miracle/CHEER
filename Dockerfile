# TippyMe Nuxt — production image (build from repo root)
#   docker build -t tippyme .
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Skip lifecycle scripts: postinstall runs `prisma generate` / `nuxt prepare`,
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
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_PUBLIC_API_URL=
RUN addgroup -S tippy && adduser -S tippy -G tippy
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
# Prisma engines + Neon WebSocket driver (must resolve from /app/node_modules).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@neondatabase ./node_modules/@neondatabase
COPY --from=build /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=build /app/node_modules/ws ./node_modules/ws
USER tippy
EXPOSE 3000
HEALTHCHECK --interval=120s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
