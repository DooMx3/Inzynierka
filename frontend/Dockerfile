FROM oven/bun:latest

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
