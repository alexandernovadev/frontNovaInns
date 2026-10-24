# ── Build ──────────────────────────────────────────────
FROM node:24-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.11.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# URL de la API: se pasa como build arg en Dokploy
ARG NG_APP_API_URL
ENV NG_APP_API_URL=$NG_APP_API_URL NODE_ENV=production
RUN pnpm build

# ── Runtime: solo el build estático + el server ─────────
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/dist ./dist
COPY scripts/serve-static.mjs ./scripts/serve-static.mjs
EXPOSE 3000
CMD ["node", "scripts/serve-static.mjs"]
