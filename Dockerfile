FROM node:22-alpine AS base
RUN apk add --no-cache openssl

FROM base AS dependencies
WORKDIR /app
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm install --no-audit --no-fund

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV MUNICIPALITY_STANDALONE=true
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" AUTH_SECRET="build-only-secret-not-for-runtime-00000000000000000000000000000000" NEXT_PUBLIC_APP_URL="http://localhost:3000"
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/lib/demo-data.ts ./src/lib/demo-data.ts
COPY --from=builder /app/src/lib/validation.ts ./src/lib/validation.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
