# ------------------- Builld stage -------------------
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# ------------------- Enable PNPM -------------------
RUN bun install -g pnpm

# ------------------- Install dependencies -------------------
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ------------------- Copy files -------------------
COPY . .
RUN pnpm run build

# ------------------- Remove dev dependencies -------------------
RUN pnpm prune --prod

# ------------------- Runner stage -------------------
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# ------------------- Set env variable to production -------------------
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# ------------------- Copy builded app -------------------
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# ------------------- Run app -------------------
EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
