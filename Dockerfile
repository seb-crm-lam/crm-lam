# Image de mise en ligne du CRM LAM sur Railway.
# Raison d'être : les PDF (mandat, bon de visite, fiche bien, compte rendu,
# engagement) sont fabriqués par Chromium via Playwright. Sans Dockerfile,
# Railway ne l'installait pas → page blanche au clic (29 septembre 2026).
FROM node:22-bookworm-slim

WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NEXT_TELEMETRY_DISABLED=1

# Outils de compilation : better-sqlite3 se compile à l'installation.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# Chromium à la version exacte attendue par Playwright, avec ses
# bibliothèques système et ses polices.
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Railway fournit PORT ; `next start` l'utilise.
CMD ["npm", "start"]
