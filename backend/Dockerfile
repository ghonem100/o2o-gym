# ---- Build stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma engines)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies (including dev) for building
COPY package*.json ./
RUN npm ci

# Copy source and Prisma schema, then generate client + build TS
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production stage ----
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client, compiled output, schema, and config
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Logs directory (winston file transport)
RUN mkdir -p logs

EXPOSE 5000

# Railway provides PORT; the app reads process.env.PORT (defaults to 5000)
CMD ["node", "dist/server.js"]
