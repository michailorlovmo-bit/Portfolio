# Deliberately a single full-node_modules image rather than Next.js's
# `output: standalone` minimal-copy pattern — that pattern requires carefully
# re-copying Prisma's generated client AND its CLI (for migrations) into the
# pruned image, which is a common source of "works locally, breaks in
# Docker" failures. This is a few hundred MB bigger, but it just runs.
FROM node:20-alpine

WORKDIR /app

# Dependencies in their own layer so `docker build` skips this step when
# only application code changed, not package.json.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

RUN mkdir -p /app/data /app/uploads

RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
