# ------------------- Builld stage -------------------
FROM oven/bun:latest AS builder
WORKDIR /app

# ------------------- Enable PNPM -------------------
RUN bun install -g pnpm

# ------------------- Install dependencies -------------------
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ------------------- Copy files -------------------
COPY . .
RUN pnpm run build

# ------------------- Runner stage -------------------
FROM oven/bun:latest AS runner
WORKDIR /app

# ------------------- Set env variable to production -------------------
ENV NODE_ENV=production

# ------------------- Enable PNPM -------------------
RUN bun install -g pnpm

# ------------------- Install dependencies -------------------
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ------------------- Copy builded app -------------------
COPY --from=builder /app/build ./build

# ------------------- Run app -------------------
EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
