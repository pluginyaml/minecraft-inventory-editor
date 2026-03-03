# ---------- Build ----------
FROM node:20.11-alpine AS builder
WORKDIR /app

# <-- DAS FEHLT BEI DIR: git fürs generate (clone) + ca-certs für https
RUN apk add --no-cache git ca-certificates

# deps
COPY package.json package-lock.json ./
RUN npm ci

# source
COPY . .

# Generate Minecraft item textures + items.json (downloads assets repo)
RUN npm run generate

# Build Next.js
RUN npm run build

# Prune dev deps for smaller runtime image
RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:20.11-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
