# Base glibc (bookworm-slim), não alpine: o binário pré-compilado do sharp traz libvips/libheif
# completos para glibc; no musl o suporte a HEIC (fotos de iPhone) é inconsistente.
FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src
COPY migrations ./migrations

# O volume de fotos é montado aqui (STORAGE_DIR).
VOLUME ["/data"]
EXPOSE 8090

# Roda sem privilégios.
RUN mkdir -p /data/argos && chown -R node:node /data /app
USER node

CMD ["node", "src/index.js"]
