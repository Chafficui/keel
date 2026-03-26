# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/email/package.json ./packages/email/
COPY packages/backend/package.json ./packages/backend/

# Install all dependencies
RUN npm ci

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY packages/email/ ./packages/email/
COPY packages/backend/ ./packages/backend/
COPY tsconfig.base.json ./

# Build packages in order
RUN npm run build -w packages/shared && \
    npm run build -w packages/email && \
    npm run build -w packages/backend

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S keel && adduser -S keel -u 1001

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/email/package.json ./packages/email/
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/email/dist ./packages/email/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Copy Drizzle migrations for runtime migration support
COPY --from=builder /app/packages/backend/src/db/migrations ./packages/backend/src/db/migrations
COPY --from=builder /app/packages/backend/drizzle.config.ts ./packages/backend/drizzle.config.ts

# Copy package.json for each workspace (needed for module resolution)
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/email/package.json ./packages/email/
COPY --from=builder /app/packages/backend/package.json ./packages/backend/

USER keel

EXPOSE ${PORT:-3005}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:${PORT:-3005}/api/health || exit 1

CMD ["node", "packages/backend/dist/index.js"]
