# Base glibc (bookworm-slim), não alpine: o binário pré-compilado do sharp traz libvips/libheif
# completos para glibc; no musl o suporte a HEIC (fotos de iPhone) é inconsistente.
FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./

# `npm ci` (e não `install`): respeita o package-lock.json, então o build é reproduzível.
#
# A verificação depois do install não é zelo excessivo. O npm 10 tem um modo de falha
# ("Exit handler never called!") em que a instalação é abortada no meio — por exemplo
# quando o registro oscila ou a rede do build intercepta TLS — e ele ainda assim **sai com
# código 0**. O build terminava "com sucesso" e a imagem subia sem o express, entrando em
# crash-loop no deploy. Carregar as dependências aqui transforma isso num build que falha,
# que é onde o problema deve aparecer.
RUN npm ci --omit=dev --no-audit --no-fund \
    && node -e "require.resolve('express'); require.resolve('mysql2'); require.resolve('multer'); require.resolve('exif-reader'); require('sharp'); console.log('dependencias OK')" \
    && npm cache clean --force

COPY src ./src
COPY migrations ./migrations

# O volume de fotos é montado aqui (STORAGE_DIR).
VOLUME ["/data"]
EXPOSE 8090

# Roda sem privilégios.
RUN mkdir -p /data/argos && chown -R node:node /data /app
USER node

CMD ["node", "src/index.js"]
