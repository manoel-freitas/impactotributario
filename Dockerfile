# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json .npmrc ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build in hybrid mode (enables /api/* routes + Node.js server)
ENV ASTRO_OUTPUT=hybrid
ENV NODE_ENV=production

# Optional: set remote data URL for updated tax rates
# ENV REFORMA_DATA_URL=https://gist.githubusercontent.com/...

RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy only the standalone server output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Astro standalone server listens on this port
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
